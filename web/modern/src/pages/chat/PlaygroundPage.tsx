/**
 * PlaygroundPage orchestrates the chat playground UI. See
 * docs/arch/modern-frontend-structure.md for the full persistence design.
 */
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ExportConversationDialog } from "@/components/chat/ExportConversationDialog";
import { ParametersPanel } from "@/components/chat/ParametersPanel";
import "highlight.js/styles/a11y-dark.css";
import "katex/dist/katex.min.css";

import { usePlaygroundViewModel } from "./playground/hooks/usePlaygroundViewModel";
import { ensureCodeBlockStyles } from "./playground/services/codeBlockStyles";

ensureCodeBlockStyles();

export function PlaygroundPage() {
	const {
		isMobileSidebarOpen,
		setIsMobileSidebarOpen,
		tokens,
		isLoadingTokens,
		models,
		isLoadingModels,
		isLoadingChannels,
		selectedToken,
		setSelectedToken,
		selectedModel,
		selectedChannel,
		channelInputValue,
		modelInputValue,
		channelSuggestions,
		modelSuggestions,
		handleChannelQueryChange,
		handleChannelSelect,
		handleChannelClear,
		handleModelQueryChange,
		handleModelSelect,
		handleModelClear,
		parameters,
		messages,
		clearConversation,
		exportDialogOpen,
		setExportDialogOpen,
		conversationId,
		conversationCreated,
		conversationCreatedBy,
		currentMessage,
		setCurrentMessage,
		isStreaming,
		handleSendMessage,
		stopGeneration,
		expandedReasonings,
		toggleReasoning,
		showPreview,
		setShowPreview,
		attachedImages,
		setAttachedImages,
		handleCopyMessage,
		handleRegenerateMessage,
		handleEditMessage,
		handleDeleteMessage,
	} = usePlaygroundViewModel();

	const {
		temperature,
		maxTokens,
		topP,
		topK,
		frequencyPenalty,
		presencePenalty,
		maxCompletionTokens,
		stopSequences,
		reasoningEffort,
		thinkingEnabled,
		thinkingBudgetTokens,
		systemMessage,
		showReasoningContent,
		focusModeEnabled,
		modelCapabilities,
		handleReasoningEffortChange,
		setTemperature,
		setMaxTokens,
		setTopP,
		setTopK,
		setFrequencyPenalty,
		setPresencePenalty,
		setMaxCompletionTokens,
		setStopSequences,
		setThinkingEnabled,
		setThinkingBudgetTokens,
		setSystemMessage,
		setShowReasoningContent,
		setFocusModeEnabled,
	} = parameters;

	const exportConversation = () => setExportDialogOpen(true);

	return (
		<div className="flex h-screen bg-gradient-to-br from-background to-muted/20 relative">
			{isMobileSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={() => setIsMobileSidebarOpen(false)}
				/>
			)}

			<ParametersPanel
				isMobileSidebarOpen={isMobileSidebarOpen}
				onMobileSidebarClose={() => setIsMobileSidebarOpen(false)}
				isLoadingTokens={isLoadingTokens}
				isLoadingModels={isLoadingModels}
				isLoadingChannels={isLoadingChannels}
				tokens={tokens}
				models={models}
				selectedToken={selectedToken}
				selectedModel={selectedModel}
				selectedChannel={selectedChannel}
				channelInputValue={channelInputValue}
				channelSuggestions={channelSuggestions}
				modelInputValue={modelInputValue}
				modelSuggestions={modelSuggestions}
				onChannelQueryChange={handleChannelQueryChange}
				onChannelSelect={handleChannelSelect}
				onChannelClear={handleChannelClear}
				onTokenChange={setSelectedToken}
				onModelQueryChange={handleModelQueryChange}
				onModelSelect={handleModelSelect}
				onModelClear={handleModelClear}
				temperature={temperature}
				maxTokens={maxTokens}
				topP={topP}
				topK={topK}
				frequencyPenalty={frequencyPenalty}
				presencePenalty={presencePenalty}
				maxCompletionTokens={maxCompletionTokens}
				stopSequences={stopSequences}
				reasoningEffort={reasoningEffort}
				thinkingEnabled={thinkingEnabled}
				thinkingBudgetTokens={thinkingBudgetTokens}
				systemMessage={systemMessage}
				showReasoningContent={showReasoningContent}
				onTemperatureChange={setTemperature}
				onMaxTokensChange={setMaxTokens}
				onTopPChange={setTopP}
				onTopKChange={setTopK}
				onFrequencyPenaltyChange={setFrequencyPenalty}
				onPresencePenaltyChange={setPresencePenalty}
				onMaxCompletionTokensChange={setMaxCompletionTokens}
				onStopSequencesChange={setStopSequences}
				onReasoningEffortChange={handleReasoningEffortChange}
				onThinkingEnabledChange={setThinkingEnabled}
				onThinkingBudgetTokensChange={setThinkingBudgetTokens}
				onSystemMessageChange={setSystemMessage}
				onShowReasoningContentChange={setShowReasoningContent}
				modelCapabilities={modelCapabilities}
			/>

			<ChatInterface
				messages={messages}
				onClearConversation={clearConversation}
				onExportConversation={exportConversation}
				currentMessage={currentMessage}
				onCurrentMessageChange={setCurrentMessage}
				onSendMessage={handleSendMessage}
				isStreaming={isStreaming}
				onStopGeneration={stopGeneration}
				selectedModel={selectedModel}
				selectedToken={selectedToken}
				supportsVision={Boolean(modelCapabilities.supportsVision)}
				attachedImages={attachedImages}
				onAttachedImagesChange={setAttachedImages}
				showPreview={showPreview}
				onPreviewChange={setShowPreview}
				onMobileMenuToggle={() => setIsMobileSidebarOpen(true)}
				showReasoningContent={showReasoningContent}
				expandedReasonings={expandedReasonings}
				onToggleReasoning={toggleReasoning}
				focusModeEnabled={focusModeEnabled}
				onFocusModeChange={setFocusModeEnabled}
				onCopyMessage={handleCopyMessage}
				onRegenerateMessage={handleRegenerateMessage}
				onEditMessage={handleEditMessage}
				onDeleteMessage={handleDeleteMessage}
			/>

			<ExportConversationDialog
				isOpen={exportDialogOpen}
				onClose={() => setExportDialogOpen(false)}
				messages={messages}
				selectedModel={selectedModel}
				conversationId={conversationId}
				conversationCreated={conversationCreated}
				conversationCreatedBy={conversationCreatedBy}
			/>
		</div>
	);
}

export default PlaygroundPage;
