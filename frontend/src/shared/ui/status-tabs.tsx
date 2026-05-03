import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/lib/utils"

export interface StatusTabOption<TValue extends string> {
  value: TValue
  label: string
}

interface StatusTabsProps<TValue extends string> {
  value: TValue
  options: Array<StatusTabOption<TValue>>
  onChange: (value: TValue) => void
  className?: string
}

export function StatusTabs<TValue extends string>({
  value,
  options,
  onChange,
  className,
}: StatusTabsProps<TValue>) {
  return (
    <div className={cn("flex items-center gap-6 border-b border-border pb-4", className)}>
      {options.map((option, index) => (
        <Button
          key={option.value}
          type="button"
          variant="tab"
          className={cn(index === 0 && "-ml-2", {
            "text-primary font-black": value === option.value,
          })}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
