/**
 * Playground Chat Hook
 *
 * Core chat functionality for the AI Playground. Manages message sending, streaming responses,
 * and reasoning/thinking content from various AI models.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageAttachment as ImageAttachmentType } from "@/components/chat/ImageAttachment";
import { useNotifications } from "@/components/ui/notifications";
import {
	getMessageStringContent,
	type Message,
	type MessageContentPart,
} from "@/lib/utils";
import type {
	UsePlaygroundChatProps,
	UsePlaygroundChatReturn,
} from "./usePlaygroundChat/types";
import { useChatRequest } from "./usePlaygroundChat/useChatRequest";
import { useStreamResponse } from "./usePlaygroundChat/useStreamResponse";

export function usePlaygroundChat(
	props: UsePlaygroundChatProps,
): UsePlaygroundChatReturn {
	const {
		selectedToken,
		selectedModel,
		messages,
		setMessages,
		expandedReasonings,
		setExpandedReasonings,
	} = props;

	const { notify } = useNotifications();
	const [isStreaming, setIsStreaming] = useState(false);

	const abortControllerRef = useRef<AbortController | null>(null);
	const updateThrottleRef = useRef<number | null>(null);
	const pendingUpdateRef = useRef<{
		content: string;
		reasoning_content: string;
	} | null>(null);

	// Throttled update function to reduce rendering frequency during streaming
	const throttledUpdateMessage = useCallback(() => {
		if (pendingUpdateRef.current) {
			const { content, reasoning_content } = pendingUpdateRef.current;
			setMessages((prev) => {
				const updated = [...prev];
				if (updated.length > 0) {
					updated[updated.length - 1] = {
						...updated[updated.length - 1],
						content,
						reasoning_content: reasoning_content.trim() || null, // Convert empty reasoning to null
					};
				}
				return updated;
			});
			pendingUpdateRef.current = null;
		}
		updateThrottleRef.current = null;
	}, [setMessages]);

	// Schedule a throttled update using requestAnimationFrame
	const scheduleUpdate = useCallback(
		(content: string, reasoning_content: string) => {
			pendingUpdateRef.current = { content, reasoning_content };

			// Auto-collapse thinking bubble when main content starts appearing
			if (content.trim().length > 0 && reasoning_content.trim().length > 0) {
				const lastMessageIndex = messages.length - 1;
				if (
					lastMessageIndex >= 0 &&
					expandedReasonings[lastMessageIndex] !== false
				) {
					setExpandedReasonings((prev) => ({
						...prev,
						[lastMessageIndex]: false,
					}));
				}
			}

			if (updateThrottleRef.current === null) {
				updateThrottleRef.current = requestAnimationFrame(
					throttledUpdateMessage,
				);
			}
		},
		[
			throttledUpdateMessage,
			messages.length,
			expandedReasonings,
			setExpandedReasonings,
		],
	);

	// Cleanup animation frames on unmount
	useEffect(() => {
		return () => {
			if (updateThrottleRef.current !== null) {
				cancelAnimationFrame(updateThrottleRef.current);
			}
		};
	}, []);

	// Helper function to add error message to chat
	const addErrorMessage = useCallback(
		(errorText: string) => {
			const errorMessage: Message = {
				role: "error",
				content: errorText,
				timestamp: Date.now(),
				error: true,
			};
			setMessages((prev) => [...prev, errorMessage]);
		},
		[setMessages],
	);

	useStreamResponse({
		selectedToken,
		scheduleUpdate,
		throttledUpdateMessage,
		updateThrottleRef,
	});

	const { makeRequest } = useChatRequest(props);

	const handleRequestFinish = useCallback(() => {
		setIsStreaming(false);
		abortControllerRef.current = null;

		// Ensure final update is applied immediately when streaming ends
		if (updateThrottleRef.current !== null) {
			cancelAnimationFrame(updateThrottleRef.current);
			throttledUpdateMessage();
		}

		// Auto-collapse reasoning bubble when both processing content and reasoning content are done
		setMessages((prev) => {
			if (prev.length > 0) {
				const lastMessage = prev[prev.length - 1];
				const lastMessageIndex = prev.length - 1;

				// Only collapse if it's an assistant message with both content and reasoning
				// DO NOT touch error messages
				if (
					lastMessage.role === "assistant" &&
					lastMessage.content &&
					getMessageStringContent(lastMessage.content).trim().length > 0 &&
					lastMessage.reasoning_content &&
					lastMessage.reasoning_content.trim().length > 0
				) {
					// Set expanded to false for the reasoning bubble
					setExpandedReasonings((prevExpanded) => ({
						...prevExpanded,
						[lastMessageIndex]: false,
					}));
				}
			}
			return prev;
		});
	}, [setMessages, setExpandedReasonings, throttledUpdateMessage]);

	const handleRequestError = useCallback(
		(error: Error) => {
			if (error.name === "AbortError") {
				notify({
					title: "Request Cancelled",
					message: "The request was cancelled by the user",
					type: "info",
				});
				// Remove the failed assistant message for cancelled requests
				setMessages((prev) => prev.slice(0, -1));
			} else {
				const errorMessage = error.message || "Failed to send message";

				// Remove the failed assistant message placeholder and add error message in one operation
				setMessages((prev) => {
					const messagesWithoutAssistant = prev.slice(0, -1);
					const errorMsg: Message = {
						role: "error",
						content: errorMessage,
						timestamp: Date.now(),
						error: true,
					};
					return [...messagesWithoutAssistant, errorMsg];
				});

				// Also show notification
				notify({
					title: "Error",
					message: errorMessage,
					type: "error",
				});
			}
			setIsStreaming(false);
			abortControllerRef.current = null;
		},
		[notify, setMessages],
	);

	const sendMessage = useCallback(
		async (messageContent: string, images?: ImageAttachmentType[]) => {
			if (
				(!messageContent.trim() && (!images || images.length === 0)) ||
				!selectedModel ||
				!selectedToken ||
				isStreaming
			) {
				return;
			}

			// Format message content
			const formatMessageContent = () => {
				const contentArray: MessageContentPart[] = [];

				if (messageContent.trim()) {
					contentArray.push({
						type: "text",
						text: messageContent.trim(),
					});
				}

				if (images && images.length > 0) {
					images.forEach((image) => {
						contentArray.push({
							type: "image_url",
							image_url: {
								url: image.base64,
							},
						});
					});
				}

				return contentArray.length === 1 && contentArray[0].type === "text"
					? messageContent.trim()
					: contentArray;
			};

			const userMessage: Message = {
				role: "user",
				content: formatMessageContent(),
				timestamp: Date.now(),
			};

			const newMessages = [...messages, userMessage];
			setMessages(newMessages);
			setIsStreaming(true);

			// Create assistant message placeholder
			const assistantMessage: Message = {
				role: "assistant",
				content: "",
				reasoning_content: null,
				timestamp: Date.now(),
				model: selectedModel,
			};
			setMessages([...newMessages, assistantMessage]);

			abortControllerRef.current = new AbortController();

			await makeRequest(newMessages, abortControllerRef.current.signal, {
				onUpdate: scheduleUpdate,
				onError: handleRequestError,
				onFinish: handleRequestFinish,
			});
		},
		[
			selectedModel,
			selectedToken,
			isStreaming,
			messages,
			setMessages,
			makeRequest,
			scheduleUpdate,
			handleRequestError,
			handleRequestFinish,
		],
	);

	const regenerateMessage = useCallback(
		async (existingMessages: Message[]) => {
			if (!selectedModel || !selectedToken || isStreaming) {
				return;
			}

			setIsStreaming(true);

			// Create assistant message placeholder
			const assistantMessage: Message = {
				role: "assistant",
				content: "",
				reasoning_content: null,
				timestamp: Date.now(),
				model: selectedModel,
			};
			setMessages([...existingMessages, assistantMessage]);

			abortControllerRef.current = new AbortController();

			await makeRequest(existingMessages, abortControllerRef.current.signal, {
				onUpdate: scheduleUpdate,
				onError: handleRequestError,
				onFinish: handleRequestFinish,
			});
		},
		[
			selectedModel,
			selectedToken,
			isStreaming,
			setMessages,
			makeRequest,
			scheduleUpdate,
			handleRequestError,
			handleRequestFinish,
		],
	);

	const stopGeneration = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
	}, []);

	return {
		isStreaming,
		sendMessage,
		regenerateMessage,
		stopGeneration,
		addErrorMessage,
	};
}
