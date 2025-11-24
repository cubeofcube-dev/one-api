import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import {
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	CHANNEL_TYPES,
	CHANNEL_TYPES_WITH_CUSTOM_KEY_FIELD,
} from "../constants";
import { getKeyPrompt } from "../helpers";
import type { ChannelForm } from "../schemas";
import { LabelWithHelp } from "./LabelWithHelp";

interface ChannelBasicInfoProps {
	form: UseFormReturn<ChannelForm>;
	groups: string[];
	normalizedChannelType: number | null;
	tr: (
		key: string,
		defaultValue: string,
		options?: Record<string, unknown>,
	) => string;
}

export const ChannelBasicInfo = ({
	form,
	groups,
	normalizedChannelType,
	tr,
}: ChannelBasicInfoProps) => {
	const watchType = form.watch("type");
	const channelTypeOverridesKeyField =
		normalizedChannelType !== null &&
		CHANNEL_TYPES_WITH_CUSTOM_KEY_FIELD.has(normalizedChannelType);

	const fieldHasError = (name: string) =>
		!!(form.formState.errors as any)?.[name];
	const errorClass = (name: string) =>
		fieldHasError(name)
			? "border-destructive focus-visible:ring-destructive"
			: "";

	const toggleGroup = (groupValue: string) => {
		const currentGroups = form.getValues("groups");
		if (currentGroups.includes(groupValue)) {
			form.setValue(
				"groups",
				currentGroups.filter((g) => g !== groupValue),
			);
		} else {
			form.setValue("groups", [...currentGroups, groupValue]);
		}
	};

	const addGroup = (groupName: string) => {
		const currentGroups = form.getValues("groups");
		if (!currentGroups.includes(groupName)) {
			form.setValue("groups", [...currentGroups, groupName]);
		}
	};

	const removeGroup = (groupToRemove: string) => {
		const currentGroups = form.getValues("groups");
		const newGroups = currentGroups.filter((g) => g !== groupToRemove);
		// Ensure at least 'default' group remains
		if (newGroups.length === 0) {
			newGroups.push("default");
		}
		form.setValue("groups", newGroups);
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<LabelWithHelp
							label={tr("name.label", "Channel Name *")}
							help={tr(
								"name.help",
								"A descriptive name for this channel to identify it in logs and lists.",
							)}
						/>
						<FormControl>
							<Input
								placeholder={tr("name.placeholder", "My Channel")}
								className={errorClass("name")}
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="type"
				render={({ field }) => (
					<FormItem>
						<LabelWithHelp
							label={tr("type.label", "Channel Type *")}
							help={tr(
								"type.help",
								"The provider type for this channel. Changing this may reset some fields.",
							)}
						/>
						<Select
							onValueChange={(value) => {
								const numVal = Number(value);
								if (!Number.isNaN(numVal)) {
									field.onChange(numVal);
								}
							}}
							value={field.value ? String(field.value) : undefined}
						>
							<FormControl>
								<SelectTrigger className={errorClass("type")}>
									<SelectValue
										placeholder={tr(
											"type.placeholder",
											"Select a channel type",
										)}
									/>
								</SelectTrigger>
							</FormControl>
							<SelectContent className="max-h-[300px]">
								{CHANNEL_TYPES.map((type) => (
									<SelectItem key={type.key} value={String(type.value)}>
										<span
											className={`mr-2 inline-block w-2 h-2 rounded-full bg-${type.color}-500`}
										/>
										{type.text}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="groups"
				render={() => (
					<FormItem className="col-span-1 md:col-span-2">
						<LabelWithHelp
							label={tr("groups.label", "Groups *")}
							help={tr(
								"groups.help",
								'User groups that can access this channel. "default" is standard for normal users.',
							)}
						/>
						<div className="flex flex-wrap gap-2 mb-2">
							{groups.map((group) => {
								const isSelected = form.watch("groups").includes(group);
								return (
									<Badge
										key={group}
										variant={isSelected ? "default" : "outline"}
										className="cursor-pointer hover:bg-primary/90"
										onClick={() => toggleGroup(group)}
									>
										{group}
									</Badge>
								);
							})}
						</div>
						<div className="flex gap-2">
							<Input
								placeholder={tr(
									"groups.add_placeholder",
									"Add custom group...",
								)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										const val = (e.target as HTMLInputElement).value.trim();
										if (val) {
											addGroup(val);
											(e.target as HTMLInputElement).value = "";
										}
									}
								}}
							/>
						</div>
						<div className="flex flex-wrap gap-2 mt-2">
							{form.watch("groups").map((group) => (
								<Badge key={group} variant="secondary" className="gap-1">
									{group}
									<span
										className="cursor-pointer ml-1 hover:text-destructive"
										onClick={() => removeGroup(group)}
									>
										×
									</span>
								</Badge>
							))}
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>

			{!channelTypeOverridesKeyField && (
				<FormField
					control={form.control}
					name="key"
					render={({ field }) => (
						<FormItem className="col-span-1 md:col-span-2">
							<LabelWithHelp
								label={tr("key.label", "API Key")}
								help={tr(
									"key.help",
									"The API key for authentication with the provider.",
								)}
							/>
							<FormControl>
								<Textarea
									placeholder={getKeyPrompt(watchType)}
									className={`font-mono text-sm ${errorClass("key")}`}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
		</div>
	);
};
