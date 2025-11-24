import { AlertCircle, Info } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logEditPageLayout } from "@/dev/layout-debug";
import { ChannelAdvancedSettings } from "./components/ChannelAdvancedSettings";
import { ChannelBasicInfo } from "./components/ChannelBasicInfo";
import { ChannelModelSettings } from "./components/ChannelModelSettings";
import { ChannelSpecificConfig } from "./components/ChannelSpecificConfig";
import { ChannelToolingSettings } from "./components/ChannelToolingSettings";
import { CHANNEL_TYPES } from "./constants";
import { useChannelForm } from "./hooks/useChannelForm";

export { normalizeChannelType } from "./helpers";

export function EditChannelPage() {
	const {
		form,
		isEdit,
		loading,
		isSubmitting,
		modelsCatalog,
		groups,
		defaultPricing,
		defaultTooling,
		defaultBaseURL,
		formInitialized,
		loadedChannelType,
		normalizedChannelType,
		watchType,
		onSubmit,
		tr,
		notify,
	} = useChannelForm();

	const selectedChannelType = CHANNEL_TYPES.find(
		(t) => t.value === normalizedChannelType,
	);
	const shouldShowLoading = loading || (isEdit && !formInitialized);

	const currentCatalogModels = useMemo(() => {
		if (normalizedChannelType === null) {
			return [] as string[];
		}
		return modelsCatalog[normalizedChannelType] ?? [];
	}, [modelsCatalog, normalizedChannelType]);

	const availableModels = useMemo(() => {
		return currentCatalogModels
			.map((model) => ({ id: model, name: model }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [currentCatalogModels]);

	useEffect(() => {
		if (!shouldShowLoading) {
			logEditPageLayout("EditChannelPage");
		}
	}, [shouldShowLoading]);

	// RHF invalid handler: toast and focus first invalid field
	const onInvalid = (errors: any) => {
		try {
			const t = form.getValues("type") as unknown;
			const p = form.getValues("priority") as unknown;
			const w = form.getValues("weight") as unknown;
			const r = form.getValues("ratelimit") as unknown;
			console.log(
				`[EDIT_CHANNEL_INVALID] key=${String(Object.keys(errors)[0] || "")} type=${String(t)}(${typeof t}) priority=${String(p)}(${typeof p}) weight=${String(w)}(${typeof w}) ratelimit=${String(r)}(${typeof r})`,
			);
		} catch (_) {
			// swallow
		}
		const firstKey = Object.keys(errors)[0];
		const firstMsg =
			errors[firstKey]?.message || "Please correct the highlighted fields.";
		notify({
			type: "error",
			title: tr("validation.error_title", "Validation error"),
			message: String(firstMsg),
		});
		const el = document.querySelector(
			`[name="${firstKey}"]`,
		) as HTMLElement | null;
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			(el as any).focus?.();
		}
	};

	if (shouldShowLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						<span className="ml-3">{tr("loading", "Loading channel...")}</span>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<TooltipProvider>
				<Card>
					<CardHeader>
						<CardTitle>
							{isEdit
								? tr("title.edit", "Edit Channel")
								: tr("title.create", "Create Channel")}
						</CardTitle>
						<CardDescription>
							{isEdit
								? tr("description.edit", "Update channel configuration")
								: tr("description.create", "Create a new API channel")}
						</CardDescription>
						{selectedChannelType?.description && (
							<div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<Info className="h-4 w-4 text-blue-600" />
								<span className="text-sm text-blue-800">
									{tr(
										`channel_type.${selectedChannelType.value}.description`,
										selectedChannelType.description,
									)}
								</span>
							</div>
						)}
						{selectedChannelType?.tip && (
							<div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
								<AlertCircle className="h-4 w-4 text-yellow-600" />
								<span
									className="text-sm text-yellow-800"
									dangerouslySetInnerHTML={{
										__html: tr(
											`channel_type.${selectedChannelType.value}.tip`,
											selectedChannelType.tip,
										),
									}}
								/>
							</div>
						)}
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit, onInvalid)}
								className="space-y-4"
							>
								{/* Basic Configuration */}
								<ChannelBasicInfo
									form={form}
									groups={groups}
									normalizedChannelType={normalizedChannelType}
									tr={tr}
								/>

								{/* Channel Specific Configuration */}
								<ChannelSpecificConfig
									form={form}
									normalizedChannelType={normalizedChannelType}
									defaultBaseURL={defaultBaseURL}
									tr={tr}
								/>

								{/* Model Configuration */}
								<ChannelModelSettings
									form={form}
									availableModels={availableModels}
									currentCatalogModels={currentCatalogModels}
									defaultPricing={defaultPricing}
									tr={tr}
									notify={notify}
								/>

								{/* Tooling Configuration */}
								<ChannelToolingSettings
									form={form}
									defaultTooling={defaultTooling}
									tr={tr}
									notify={notify}
								/>

								{/* Advanced Configuration */}
								<ChannelAdvancedSettings form={form} tr={tr} />

								<div className="flex justify-end gap-4 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => window.history.back()}
									>
										{tr("common.cancel", "Cancel")}
									</Button>
									<Button type="submit" disabled={isSubmitting}>
										{isSubmitting
											? tr("common.saving", "Saving...")
											: tr("common.save", "Save")}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>
			</TooltipProvider>
		</div>
	);
}
