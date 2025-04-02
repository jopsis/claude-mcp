---
title: SSE 기반 MCP 서비스 개발하기
description: SSE 기반 MCP 지능형 쇼핑 도우미 서비스 개발하기
section: typescript
prev: use-llm-dev-mcp
pubDate: 2025-04-02
order: 4
---

# SSE MCP AI 쇼핑 도우미 서비스 개발하기

[MCP](https://www.claudemcp.com/)는 두 가지 통신 전송 방식을 지원합니다: `STDIO`(표준 입출력) 또는 `SSE`(Server-Sent Events)이며, 둘 다 메시지 형식화를 위해 `JSON-RPC 2.0`을 사용합니다. `STDIO`는 로컬 통합에 사용되고, `SSE`는 네트워크 기반 통신에 사용됩니다.

예를 들어, 명령줄에서 직접 MCP 서비스를 사용하려면 `STDIO` 전송 방식을 사용할 수 있습니다. 웹 페이지에서 MCP 서비스를 사용하려면 `SSE` 전송 방식을 사용할 수 있습니다.

다음으로, 다음과 같은 핵심 기능을 갖춘 SSE 유형 MCP 서비스를 사용하여 MCP 기반 지능형 쇼핑 서비스 도우미를 개발하겠습니다:

- 제품 정보와 재고 수준에 실시간으로 접근하고, 맞춤형 주문을 지원합니다.
- 고객 선호도와 가용 재고를 기반으로 제품을 추천합니다.
- MCP 도구 서버를 사용하여 마이크로서비스와 실시간으로 상호작용합니다.
- 제품 문의에 답변할 때 실시간 재고 수준을 확인합니다.
- 제품 ID와 수량을 사용하여 제품 구매를 용이하게 합니다.
- 실시간 재고 수준 업데이트를 제공합니다.
- 자연어 쿼리를 통한 주문 거래의 임시 분석을 지원합니다.

![](/images/shop-ai-with-mcp.png)

> 여기서는 MCP 서비스의 AI 도우미로 Anthropic Claude 3.5 Sonnet 모델을 사용하지만, 도구 호출을 지원하는 다른 모델도 사용할 수 있습니다.

먼저, 제품 목록을 위한 API 인터페이스를 노출하는 제품 마이크로서비스가 필요합니다. 그런 다음 주문 생성, 재고 정보 등을 위한 API 인터페이스를 노출하는 주문 마이크로서비스를 제공할 것입니다.

핵심 구성 요소는 MCP SSE 서버로, 제품 및 주문 마이크로서비스의 데이터를 SSE 프로토콜을 사용하여 LLM에 도구로 노출합니다.

마지막으로, MCP 클라이언트를 사용하여 SSE 프로토콜을 통해 MCP SSE 서버에 연결하고 LLM과 상호작용할 것입니다.

> 전체 프로젝트 코드는 [https://github.com/cnych/mcp-sse-demo](https://github.com/cnych/mcp-sse-demo)를 참조하세요.

## 마이크로서비스

제품 및 주문 마이크로서비스를 개발하고 API 인터페이스를 노출해 보겠습니다.

먼저, 제품, 재고 및 주문에 대한 타입을 정의하겠습니다.

```typescript
// types/index.ts
export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
}

export interface Inventory {
  productId: number;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: number;
  customerName: string;
  items: Array<{ productId: number; quantity: number }>;
  totalAmount: number;
  orderDate: string;
}
```

그런 다음 Express를 사용하여 제품 및 주문 마이크로서비스를 노출하고 API 인터페이스를 제공할 수 있습니다. 이 예제는 시뮬레이션이므로 간단한 메모리 데이터를 사용하고 다음 함수를 통해 데이터를 노출합니다. (실제 환경에서는 여전히 마이크로서비스와 데이터베이스를 사용하여 구현해야 합니다.)

```typescript
// services/product-service.ts
import { Product, Inventory, Order } from "../types/index.js";

// Simulate data storage
let products: Product[] = [
  {
    id: 1,
    name: "智能手表Galaxy",
    price: 1299,
    description: "健康监测，运动追踪，支持多种应用",
  },
  {
    id: 2,
    name: "无线蓝牙耳机Pro",
    price: 899,
    description: "主动降噪，30小时续航，IPX7防水",
  },
  {
    id: 3,
    name: "便携式移动电源",
    price: 299,
    description: "20000mAh大容量，支持快充，轻薄设计",
  },
  {
    id: 4,
    name: "华为MateBook X Pro",
    price: 1599,
    description: "14.2英寸全面屏，3:2比例，100% sRGB色域",
  },
];

// Simulate inventory data
let inventory: Inventory[] = [
  { productId: 1, quantity: 100 },
  { productId: 2, quantity: 50 },
  { productId: 3, quantity: 200 },
  { productId: 4, quantity: 150 },
];

let orders: Order[] = [];

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function getInventory(): Promise<Inventory[]> {
  return inventory.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      ...item,
      product,
    };
  });
}

export async function getOrders(): Promise<Order[]> {
  return [...orders].sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
}

export async function createPurchase(
  customerName: string,
  items: { productId: number; quantity: number }[]
): Promise<Order> {
  if (!customerName || !items || items.length === 0) {
    throw new Error("Invalid request: missing customer name or items");
  }

  let totalAmount = 0;

  // Verify inventory and calculate total price
  for (const item of items) {
    const inventoryItem = inventory.find((i) => i.productId === item.productId);
    const product = products.find((p) => p.id === item.productId);

    if (!inventoryItem || !product) {
      throw new Error(`Product ID ${item.productId} does not exist`);
    }

    if (inventoryItem.quantity < item.quantity) {
      throw new Error(
        `Product ${product.name} has insufficient inventory. Available: ${inventoryItem.quantity}`
      );
    }

    totalAmount += product.price * item.quantity;
  }

  // Create order
  const order: Order = {
    id: orders.length + 1,
    customerName,
    items,
    totalAmount,
    orderDate: new Date().toISOString(),
  };

  // Update inventory
  items.forEach((item) => {
    const inventoryItem = inventory.find(
      (i) => i.productId === item.productId
    )!;
    inventoryItem.quantity -= item.quantity;
  });

  orders.push(order);
  return order;
}
```

그런 다음 MCP 도구를 사용하여 이러한 API 인터페이스를 노출할 수 있습니다.

```typescript
// mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getProducts,
  getInventory,
  getOrders,
  createPurchase,
} from "./services/product-service.js";

export const server = new McpServer({
  name: "mcp-sse-demo",
  version: "1.0.0",
  description:
    "MCP tools for product query, inventory management, and order processing",
});

// Get product list tool
server.tool("getProducts", "Get all product information", {}, async () => {
  console.log("Getting product list");
  const products = await getProducts();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(products),
      },
    ],
  };
});

// Get inventory information tool
server.tool(
  "getInventory",
  "Get all product inventory information",
  {},
  async () => {
    console.log("Getting inventory information");
    const inventory = await getInventory();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(inventory),
        },
      ],
    };
  }
);

// Get order list tool
server.tool("getOrders", "Get all order information", {}, async () => {
  console.log("Getting order list");
  const orders = await getOrders();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(orders),
      },
    ],
  };
});

// Purchase product tool
server.tool(
  "purchase",
  "Purchase product",
  {
    items: z
      .array(
        z.object({
          productId: z.number().describe("Product ID"),
          quantity: z.number().describe("Purchase quantity"),
        })
      )
      .describe("List of products to purchase"),
    customerName: z.string().describe("Customer name"),
  },
  async ({ items, customerName }) => {
    console.log("Processing purchase request", { items, customerName });
    try {
      const order = await createPurchase(customerName, items);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(order),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error.message }),
          },
        ],
      };
    }
  }
);
```

여기서는 4개의 도구를 정의합니다:

- `getProducts`: 모든 제품 정보 검색
- `getInventory`: 모든 제품의 재고 정보 검색
- `getOrders`: 모든 주문 정보 검색
- `purchase`: 제품 구매

만약 Stdio 유형 MCP 서비스라면 명령줄에서 이러한 도구를 직접 사용할 수 있지만, 이제 SSE 유형 MCP 서비스를 사용해야 하므로 MCP SSE 서버를 개발해야 합니다.

## MCP SSE 서버

다음으로, SSE 프로토콜을 사용하여 제품 및 주문 마이크로서비스 데이터를 도구로 노출하는 MCP SSE 서버를 개발합니다.

```typescript
// mcp-sse-server.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server as mcpServer } from "./mcp-server.js"; // Rename to avoid naming conflict

const app = express();
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Store active connections
const connections = new Map();

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: connections.size,
  });
});

// SSE connection establishment endpoint
app.get("/sse", async (req, res) => {
  // Instantiate SSE transport object
  const transport = new SSEServerTransport("/messages", res);
  // Get sessionId
  const sessionId = transport.sessionId;
  console.log(
    `[${new Date().toISOString()}] New SSE connection established: ${sessionId}`
  );

  // Register connection
  connections.set(sessionId, transport);

  // Connection interruption handling
  req.on("close", () => {
    console.log(
      `[${new Date().toISOString()}] SSE connection closed: ${sessionId}`
    );
    connections.delete(sessionId);
  });

  // Connect the transport object to the MCP server
  await mcpServer.connect(transport);
  console.log(
    `[${new Date().toISOString()}] MCP server connection successful: ${sessionId}`
  );
});

// Endpoint for receiving client messages
app.post("/messages", async (req: Request, res: Response) => {
  try {
    console.log(
      `[${new Date().toISOString()}] Received client message:`,
      req.query
    );
    const sessionId = req.query.sessionId as string;

    // Find the corresponding SSE connection and process the message
    if (connections.size > 0) {
      const transport: SSEServerTransport = connections.get(
        sessionId
      ) as SSEServerTransport;
      // Use transport to process messages
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        throw new Error("No active SSE connection");
      }
    } else {
      throw new Error("No active SSE connection");
    }
  } catch (error: any) {
    console.error(
      `[${new Date().toISOString()}] Failed to process client message:`,
      error
    );
    res
      .status(500)
      .json({ error: "Failed to process message", message: error.message });
  }
});

// Graceful shutdown of all connections
async function closeAllConnections() {
  console.log(
    `[${new Date().toISOString()}] Closing all connections (${
      connections.size
    }个)`
  );
  for (const [id, transport] of connections.entries()) {
    try {
      // Send shutdown event
      transport.res.write(
        'event: server_shutdown\ndata: {"reason": "Server is shutting down"}\n\n'
      );
      transport.res.end();
      console.log(`[${new Date().toISOString()}] Connection closed: ${id}`);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Failed to close connection: ${id}`,
        error
      );
    }
  }
  connections.clear();
}

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Unhandled exception:`, err);
  res.status(500).json({ error: "Server internal error" });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log(
    `[${new Date().toISOString()}] Received SIGTERM signal, preparing to close`
  );
  await closeAllConnections();
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log(
    `[${new Date().toISOString()}] Received SIGINT signal, preparing to close`
  );
  await closeAllConnections();
  process.exit(0);
});

// Start server
const port = process.env.PORT || 8083;
const server = app.listen(port, () => {
  console.log(
    `[${new Date().toISOString()}] Smart shopping MCP SSE server started, address: http://localhost:${port}`
  );
  console.log(`- SSE connection endpoint: http://localhost:${port}/sse`);
  console.log(
    `- Message processing endpoint: http://localhost:${port}/messages`
  );
  console.log(`- Health check endpoint: http://localhost:${port}/health`);
});
```

여기서는 Express를 사용하여 SSE 연결 엔드포인트 `/sse`를 노출하고, 클라이언트 메시지를 수신합니다. `SSEServerTransport`를 사용하여 SSE 전송 객체를 생성하고 메시지 처리 엔드포인트를 `/messages`로 지정합니다.

```typescript
const transport = new SSEServerTransport("/messages", res);
```

전송 객체가 생성되면 전송 객체를 MCP 서버에 연결할 수 있으며, 다음과 같습니다:

```typescript
// Connect the transport object to the MCP server
await mcpServer.connect(transport);
```

그런 다음 SSE 연결 엔드포인트 `/sse`를 통해 클라이언트 메시지를 수신할 수 있으며, 메시지 처리 엔드포인트 `/messages`를 사용하여 클라이언트 메시지를 처리할 수 있습니다. 클라이언트 메시지가 수신되면 `/messages` 엔드포인트에서 클라이언트 메시지를 처리하기 위해 `transport` 객체를 사용해야 합니다:

```typescript
// Use transport to process messages
await transport.handlePostMessage(req, res);
```

이것은 도구 나열 및 도구 호출 작업과 동일합니다.

## MCP 클라이언트

다음으로, MCP SSE 서버에 연결하고 LLM과 상호작용할 MCP 클라이언트를 개발합니다. 명령줄 클라이언트 또는 웹 클라이언트를 개발할 수 있습니다.

명령줄 클라이언트는 이미 소개했으며, 유일한 차이점은 이제 SSE 프로토콜을 사용하여 MCP SSE 서버에 연결해야 한다는 것입니다.

```typescript
// Create MCP client
const mcpClient = new McpClient({
  name: "mcp-sse-demo",
  version: "1.0.0",
});

// Create SSE transport object
const transport = new SSEClientTransport(new URL(config.mcp.serverUrl));

// Connect to MCP server
await mcpClient.connect(transport);
```

그런 다음 다른 작업은 이전에 소개한 명령줄 클라이언트와 동일하며, 이는 모든 도구를 나열하고, 사용자의 질문과 도구를 LLM에 전달하여 처리하는 것입니다. LLM이 결과를 반환하면 결과에 따라 도구를 호출하고, 도구 호출 결과와 이전 메시지를 LLM에 다시 보내 최종 결과를 얻습니다.

웹 클라이언트는 명령줄 클라이언트와 동일하며, 유일한 차이점은 이제 이러한 처리 단계를 일부 인터페이스에 구현하고, 웹 페이지를 통해 이러한 인터페이스를 호출하는 것입니다.

먼저 MCP 클라이언트를 초기화하고, 모든 도구를 가져오고, Anthropic에서 필요한 배열 형식으로 도구 형식을 변환한 다음 Anthropic 클라이언트를 생성합니다.

```typescript
// Initialize MCP client
async function initMcpClient() {
  if (mcpClient) return;

  try {
    console.log("Connecting to MCP server...");
    mcpClient = new McpClient({
      name: "mcp-client",
      version: "1.0.0",
    });

    const transport = new SSEClientTransport(new URL(config.mcp.serverUrl));

    await mcpClient.connect(transport);
    const { tools } = await mcpClient.listTools();
    // Convert tool format to the array form required by Anthropic
    anthropicTools = tools.map((tool: any) => {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      };
    });
    // Create Anthropic client
    aiClient = createAnthropicClient(config);

    console.log("MCP client and tools initialized");
  } catch (error) {
    console.error("Failed to initialize MCP client:", error);
    throw error;
  }
}
```

그런 다음 우리는 우리의 필요에 따라 API 인터페이스를 개발할 수 있습니다. 예를 들어, 여기서는 사용자의 질문을 수신하고, MCP 클라이언트의 도구를 호출하고, 도구 호출 결과와 이전 메시지를 LLM에 다시 보내 최종 결과를 얻는 채팅 인터페이스를 개발합니다.

```typescript
// API: Chat request
apiRouter.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      console.warn("请求中消息为空");
      return res.status(400).json({ error: "消息不能为空" });
    }

    // Build message history
    const messages = [...history, { role: "user", content: message }];

    // Call AI
    const response = await aiClient.messages.create({
      model: config.ai.defaultModel,
      messages,
      tools: anthropicTools,
      max_tokens: 1000,
    });

    // Process tool calls
    const hasToolUse = response.content.some(
      (item) => item.type === "tool_use"
    );

    if (hasToolUse) {
      // Process all tool calls
      const toolResults = [];

      for (const content of response.content) {
        if (content.type === "tool_use") {
          const name = content.name;
          const toolInput = content.input as
            | { [x: string]: unknown }
            | undefined;

          try {
            // Call MCP tool
            if (!mcpClient) {
              console.error("MCP client not initialized");
              throw new Error("MCP client not initialized");
            }
            console.log(`Calling MCP tool: ${name}`);
            const toolResult = await mcpClient.callTool({
              name,
              arguments: toolInput,
            });

            toolResults.push({
              name,
              result: toolResult,
            });
          } catch (error: any) {
            console.error(`Tool call failed: ${name}`, error);
            toolResults.push({
              name,
              error: error.message,
            });
          }
        }
      }

      // Send tool results back to AI to get the final response
      const finalResponse = await aiClient.messages.create({
        model: config.ai.defaultModel,
        messages: [
          ...messages,
          {
            role: "user",
            content: JSON.stringify(toolResults),
          },
        ],
        max_tokens: 1000,
      });

      const textResponse = finalResponse.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      res.json({
        response: textResponse,
        toolCalls: toolResults,
      });
    } else {
      // Return AI response directly
      const textResponse = response.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      res.json({
        response: textResponse,
        toolCalls: [],
      });
    }
  } catch (error: any) {
    console.error("Chat request processing failed:", error);
    res.status(500).json({ error: error.message });
  }
});
```

코어 구현은 명령줄 클라이언트와 동일하며, 유일한 차이점은 이제 이러한 처리 단계를 일부 인터페이스에 구현하는 것입니다.

## 사용

다음은 명령줄 클라이언트를 사용하는 예제입니다:

![](/images/shop-ai-with-mcp-cli.png)

우리는 또한 Cursor에서 사용할 수 있으며, `.cursor/mcp.json` 파일을 생성하고 다음 내용을 추가할 수 있습니다:

```json
{
  "mcpServers": {
    "products-sse": {
      "url": "http://localhost:8083/sse"
    }
  }
}
```

그런 다음 우리는 Cursor 설정 페이지에서 이 MCP 서비스를 볼 수 있으며, 그런 다음 Cursor에서 이 MCP 서비스를 사용할 수 있습니다.

![](/images/shop-ai-with-mcp-cursor.png)

다음은 우리가 개발한 웹 클라이언트를 사용하는 예제입니다:

![](/images/shop-ai-with-mcp-web1.png)

![](/images/shop-ai-with-mcp-web2.png)

## 요약

LLM이 사용자에게 도구 호출을 트리거하기로 결정하면 도구 설명의 품질이 중요합니다:

- **정확한 설명**：각 도구의 설명이 명확하고 구체적이어야 하며, 도구를 사용할 시기를 도구 호출을 정확하게 식별할 수 있는 키워드를 포함해야 합니다.
- **충돌 피하기**：동일한 기능을 가진 여러 도구를 제공하지 마세요. 이는 LLM이 잘못된 도구를 선택할 수 있습니다.
- **테스트 검증**：배포 전에 다양한 사용자 쿼리 시나리오를 사용하여 도구 호출 정확도를 테스트하세요.
  MCP 서버는 다양한 기술을 사용하여 구현할 수 있습니다:

- Python SDK
- TypeScript/JavaScript
- 기타 프로그래밍 언어

선택은 팀의 친숙도와 기존 기술 스택을 기반으로 해야 합니다.

AI 어시스턴트와 MCP 서버를 기존 마이크로서비스 아키텍처에 통합하면 다음과 같은 장점이 있습니다:

1. **실시간 데이터**: SSE(Server-Sent Events)를 통해 실시간 또는 준실시간 업데이트를 제공하며, 이는 재고 정보 및 주문 상태와 같은 동적 데이터에 특히 중요합니다
2. **확장성**: 시스템의 다양한 부분을 독립적으로 확장할 수 있으며, 예를 들어 자주 사용되는 재고 확인 서비스를 별도로 확장할 수 있습니다
3. **복원력**: 단일 마이크로서비스의 장애가 전체 시스템 운영에 영향을 미치지 않아 시스템 안정성을 보장합니다
4. **유연성**: 다양한 팀이 시스템의 다양한 부분을 독립적으로 처리할 수 있으며, 필요할 때 다양한 기술 스택을 사용할 수 있습니다
5. **효율적인 통신**: SSE는 지속적인 폴링보다 더 효율적이며, 데이터가 변경될 때만 업데이트를 전송합니다
6. **향상된 사용자 경험**: 실시간 업데이트와 빠른 응답으로 고객 만족도를 향상시킵니다
7. **간소화된 클라이언트**: 클라이언트 코드가 더 간결하며, 복잡한 폴링 메커니즘 없이 서버 이벤트만 수신하면 됩니다

프로덕션 환경에서 사용하려면 다음 사항도 고려해야 합니다:

- 잠재적 오류를 식별하기 위한 철저한 테스트 수행
- 장애 복구 메커니즘 설계
- 도구 호출 성능 및 정확도를 추적하는 모니터링 시스템 구현
- 백엔드 서비스의 부하를 줄이기 위한 캐싱 레이어 추가 고려

이러한 방법을 통해 사용자에게 실시간, 개인화된 쇼핑 경험을 제공하는 효율적이고 신뢰할 수 있는 MCP 기반 지능형 쇼핑 서비스 어시스턴트를 구축할 수 있습니다.
