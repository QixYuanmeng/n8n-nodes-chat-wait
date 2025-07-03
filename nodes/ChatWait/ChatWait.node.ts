import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class ChatWait implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Wait',
		name: 'chatWait',
		icon: 'file:chatwait.svg',
		group: ['transform'],
		version: 1,
		description: 'Wait for user input in multi-turn conversations with context memory and branch flow control',
		defaults: {
			name: 'Chat Wait',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main, NodeConnectionType.Main],
		outputNames: ['Continue', 'User Input'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'chat-wait',
			},
		],
		properties: [
			{
				displayName: 'Prompt Message',
				name: 'promptMessage',
				type: 'string',
				default: 'Please enter your response:',
				placeholder: 'Enter message to prompt the user',
				description: 'Message to display to the user',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeoutSeconds',
				type: 'number',
				default: 300,
				description: 'Timeout for waiting user input, 0 means no timeout',
			},
			{
				displayName: 'Enable Context Memory',
				name: 'enableMemory',
				type: 'boolean',
				default: true,
				description: 'Whether to enable conversation history memory functionality',
			},
			{
				displayName: 'Memory Storage Key',
				name: 'memoryKey',
				type: 'string',
				default: 'chat_history',
				displayOptions: {
					show: {
						enableMemory: [true],
					},
				},
				description: 'Key name for storing conversation history',
			},
			{
				displayName: 'Max History Count',
				name: 'maxHistoryCount',
				type: 'number',
				default: 10,
				displayOptions: {
					show: {
						enableMemory: [true],
					},
				},
				description: 'Maximum number of conversation history records to keep',
			},
			{
				displayName: 'Session ID Field',
				name: 'sessionIdField',
				type: 'string',
				default: 'sessionId',
				description: 'Field name used to identify sessions for different user conversations',
			},
			{
				displayName: 'Immediate Output',
				name: 'immediateOutput',
				type: 'boolean',
				default: true,
				description: 'Whether to immediately output data from previous nodes before waiting for user input',
			},
			{
				displayName: 'Output Fields',
				name: 'outputFields',
				type: 'string',
				default: '',
				placeholder: 'field1,field2,field3 or leave empty for all fields',
				displayOptions: {
					show: {
						immediateOutput: [true],
					},
				},
				description: 'Comma-separated list of fields to include in immediate output. Leave empty to include all fields.',
			},
			{
				displayName: 'Include Input Data',
				name: 'includeInputData',
				type: 'boolean',
				default: true,
				description: 'Whether to include original input data when outputting user input',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[][] = [[], []];
		
		const promptMessage = this.getNodeParameter('promptMessage', 0) as string;
		const timeoutSeconds = this.getNodeParameter('timeoutSeconds', 0) as number;
		const enableMemory = this.getNodeParameter('enableMemory', 0) as boolean;
		const memoryKey = this.getNodeParameter('memoryKey', 0) as string;
		const maxHistoryCount = this.getNodeParameter('maxHistoryCount', 0) as number;
		const sessionIdField = this.getNodeParameter('sessionIdField', 0) as string;
		const immediateOutput = this.getNodeParameter('immediateOutput', 0) as boolean;
		const outputFields = this.getNodeParameter('outputFields', 0) as string;
		const includeInputData = this.getNodeParameter('includeInputData', 0) as boolean;

		// 如果启用立即输出，将前置数据输出到第一个输出端口
		if (immediateOutput) {
			returnData[0] = items.map(item => {
				let outputData = { ...item.json };
				
				// 如果指定了输出字段，只包含这些字段
				if (outputFields.trim()) {
					const fields = outputFields.split(',').map(f => f.trim()).filter(f => f);
					const filteredData: any = {};
					fields.forEach(field => {
						if (item.json.hasOwnProperty(field)) {
							filteredData[field] = item.json[field];
						}
					});
					outputData = filteredData;
				}

				return {
					...item,
					json: {
						...outputData,
						chatWaitStatus: 'immediate_output',
						promptMessage,
						timestamp: new Date().toISOString(),
					}
				};
			});
		}

		// 处理每个输入项
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];
			const sessionId = item.json[sessionIdField] as string || 'default';

			try {
				// 获取对话历史
				let chatHistory: any[] = [];
				if (enableMemory) {
					const historyData = await this.getWorkflowStaticData('global');
					const historyKey = `${memoryKey}_${sessionId}`;
					chatHistory = (historyData[historyKey] as any[]) || [];
				}

				// 生成等待数据
				const waitData: IDataObject = {
					chatWaitId: `chat_wait_${Date.now()}_${Math.random().toString(36).substring(7)}`,
					sessionId,
					promptMessage,
					timeoutSeconds,
					status: 'waiting',
					timestamp: new Date().toISOString(),
					// webhookUrl will be provided by n8n when webhook is called
				};

				// 包含对话历史
				if (enableMemory && chatHistory.length > 0) {
					waitData.chatHistory = chatHistory.slice(-maxHistoryCount);
				}

				// 包含原始输入数据
				if (includeInputData) {
					waitData.inputData = item.json;
				}

				// 如果没有启用立即输出，将等待数据添加到第一个输出端口
				if (!immediateOutput) {
					returnData[0].push({
						json: waitData,
						pairedItem: { item: itemIndex },
					});
				}

				// 存储等待状态（用于webhook接收时匹配）
				const staticData = this.getWorkflowStaticData('global');
				staticData[waitData.chatWaitId as string] = {
					sessionId,
					itemIndex,
					inputData: item.json,
					timestamp: waitData.timestamp,
				};

			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({
						json: {
							error: error.message,
							chatWaitStatus: 'error',
						},
						pairedItem: { item: itemIndex },
					});
				} else {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}
			}
		}

		return returnData;
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const query = this.getQueryData() as IDataObject;

		const chatWaitId = bodyData.chatWaitId as string || query.chatWaitId as string;
		const userInput = bodyData.userInput as string || bodyData.message as string;

		if (!chatWaitId) {
			return {
				webhookResponse: {
					status: 400,
					body: { error: 'Missing chatWaitId' },
				},
			};
		}

		if (!userInput) {
			return {
				webhookResponse: {
					status: 400,
					body: { error: 'Missing userInput or message' },
				},
			};
		}

		try {
			// 获取等待状态
			const staticData = this.getWorkflowStaticData('global');
			const waitData = staticData[chatWaitId] as {
				sessionId: string;
				itemIndex: number;
				inputData: IDataObject;
				timestamp: string;
			};

			if (!waitData) {
				return {
					webhookResponse: {
						status: 404,
						body: { error: 'Chat wait session not found or expired' },
					},
				};
			}

			// 构建用户输入响应数据
			const responseData: IDataObject = {
				chatWaitId,
				sessionId: waitData.sessionId,
				userInput,
				timestamp: new Date().toISOString(),
				inputData: waitData.inputData,
				chatWaitStatus: 'user_input_received',
			};

			// 处理上下文记忆
			const enableMemory = this.getNodeParameter('enableMemory', 0) as boolean;
			if (enableMemory) {
				const memoryKey = this.getNodeParameter('memoryKey', 0) as string;
				const maxHistoryCount = this.getNodeParameter('maxHistoryCount', 0) as number;
				
				const historyKey = `${memoryKey}_${waitData.sessionId}`;
				let chatHistory = (staticData[historyKey] as any[]) || [];
				
				// 添加新的对话记录
				chatHistory.push({
					type: 'user',
					message: userInput,
					timestamp: responseData.timestamp,
				});

				// 限制历史记录数量
				if (chatHistory.length > maxHistoryCount) {
					chatHistory = chatHistory.slice(-maxHistoryCount);
				}

				staticData[historyKey] = chatHistory;
				responseData.chatHistory = chatHistory;
			}

			// 清理等待状态
			delete staticData[chatWaitId];

			// 返回成功响应
			return {
				webhookResponse: {
					status: 200,
					body: {
						success: true,
						message: 'User input received successfully',
						chatWaitId,
						sessionId: waitData.sessionId,
					},
				},
				workflowData: [
					[], // 第一个输出端口为空
					[   // 第二个输出端口输出用户输入数据
						{
							json: responseData,
						},
					],
				],
			};

		} catch (error) {
			return {
				webhookResponse: {
					status: 500,
					body: { error: error.message },
				},
			};
		}
	}
}
