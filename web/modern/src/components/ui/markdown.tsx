import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CopyButton } from "./copy-button";

// Markdown renderer component with XSS protection and syntax highlighting
export const MarkdownRenderer = React.memo<{
	content: string;
	className?: string;
}>(({ content, className }) => {
	// Process content to handle line breaks more intelligently
	// Convert single line breaks to markdown line breaks, but limit consecutive empty lines
	const processedContent = content.replace(/(?<!\n)\n(?!\n)/g, "  \n"); // Convert single line breaks to markdown hard breaks

	return (
		<div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
			<ReactMarkdown
				remarkPlugins={[remarkMath, remarkGfm, remarkEmoji]}
				rehypePlugins={[rehypeSanitize, rehypeHighlight, rehypeKatex]}
				components={{
					pre({
						node,
						children,
						...props
					}: React.ComponentPropsWithoutRef<"pre"> & { node?: unknown }) {
						// Extract the raw text content from children for copying
						const extractTextContent = (element: React.ReactNode): string => {
							if (typeof element === "string") {
								return element;
							}
							if (
								React.isValidElement(element) &&
								(element.props as Record<string, unknown>).children
							) {
								const children = (element.props as Record<string, unknown>)
									.children;
								if (Array.isArray(children)) {
									return children.map(extractTextContent).join("");
								}
								return extractTextContent(children as React.ReactNode);
							}
							if (Array.isArray(element)) {
								return element.map(extractTextContent).join("");
							}
							return "";
						};

						const codeContent = extractTextContent(children);

						// Count lines to determine appropriate button size
						const lineCount = codeContent.trim().split("\n").length;
						const isSingleLine = lineCount === 1;

						// Use smaller button for single-line code blocks
						const buttonSize = isSingleLine ? "h-6 w-6 p-0" : "h-8 w-8 p-0";
						const _iconSize = isSingleLine ? "h-2.5 w-2.5" : "h-3 w-3";

						return (
							<div className="relative group">
								<pre {...props}>{children}</pre>
								{/* Copy button that appears on hover - size adapts to content */}
								<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
									<CopyButton
										text={codeContent}
										variant="ghost"
										size="sm"
										className={`${buttonSize} bg-background/80 hover:bg-background border border-border/50 backdrop-blur-sm`}
										successMessage="Code copied!"
									/>
								</div>
							</div>
						);
					},
					code({
						node,
						inline,
						className,
						children,
						...props
					}: React.ComponentPropsWithoutRef<"code"> & {
						node?: unknown;
						inline?: boolean;
					}) {
						// For inline code, don't add copy functionality
						if (inline) {
							return (
								<code className={className} {...props}>
									{children}
								</code>
							);
						}

						// For code blocks, let the pre component handle the wrapper
						return (
							<code className={className} {...props}>
								{children}
							</code>
						);
					},
				}}
			>
				{processedContent}
			</ReactMarkdown>
		</div>
	);
});
