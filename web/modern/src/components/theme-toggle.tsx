import { Check, Laptop, Moon, Sun, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

type ThemeOption = {
  value: "light" | "dark" | "system"
  label: string
  Icon: LucideIcon
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Laptop },
]

// ThemeToggle renders a minimal dropdown to switch between light, dark, and system themes.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const activeOption =
    THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0]
  const ActiveIcon = activeOption.Icon

  const handleSelect = (value: ThemeOption["value"]) => {
    setTheme(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="h-9 w-9"
        >
          <ActiveIcon className="h-[1.2rem] w-[1.2rem]" aria-hidden="true" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const isActive = value === theme

          return (
            <DropdownMenuItem
              key={value}
              onSelect={() => handleSelect(value)}
              className={cn(
                "flex items-center gap-2",
                isActive && "bg-muted text-foreground focus:bg-muted"
              )}
              role="menuitemradio"
              aria-checked={isActive}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1 text-left">{label}</span>
              {isActive ? (
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
