import type * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
} from "react-hook-form";
import { cn } from "@/lib/utils";

export const Form = FormProvider;

export function FormItem({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("space-y-2", className)} {...props} />;
}
export function FormLabel({
	className,
	...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: generic label component
		<label
			className={cn("text-sm font-medium leading-none", className)}
			{...props}
		/>
	);
}
export function FormControl({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("space-y-2", className)} {...props} />;
}
export function FormMessage({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p className={cn("text-xs text-destructive", className)} {...props}>
			{children}
		</p>
	);
}
export const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return <Controller {...props} />;
};
