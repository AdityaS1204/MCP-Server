import readline from 'readline/promises'
import { config } from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

config();


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY});

const mcpClient = new Client({
    name:"example-client",
    version:"1.0.0",
})

const chatHistory = []

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})
let tools = []
mcpClient.connect(new SSEClientTransport(new URL("http://localhost:3001/sse")))
.then(async () => {
    console.log('connected to MCP server')

    const tools = (await mcpClient.listTools()).tools.map(tool => {
        return {
            name:tool.name,
            description:tool.description,
            parameters:{
                type:tool.inputSchema.type,
                properties:tool.inputSchema.properties,
                required:tool.inputSchema.required
            }
        }
    })
    console.log("Available Tools: ",tools)
})

 async function chatLoop(){
    const question = await rl.question("you: ");

    chatHistory.push({
        role: "user",
        parts: [
            {
                text: question,
                type: "text"
            },
        ]
    })

    const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", 
            contents:chatHistory,
            config:{
                tools:[
                    {
                        functionDeclarations:tools,
                    }
                ]
            }
    })

    const responseText = response.candidates[0].content.parts[0].text

    chatHistory.push({
        role: "model",
        parts: [
            {
                text: responseText,
                type: "text"
            },
        ]
    })
    console.log(`Ai: ${responseText}`)
    chatLoop();
}

chatLoop();