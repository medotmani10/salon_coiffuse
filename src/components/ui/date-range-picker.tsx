import { format } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps {
    className?: string;
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    language?: "fr" | "ar";
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
    language = "fr",
}: DatePickerWithRangeProps) {
    const locale = language === "ar" ? ar : fr;

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y", { locale })} -{" "}
                                    {format(date.to, "LLL dd, y", { locale })}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y", { locale })
                            )
                        ) : (
                            <span>{language === 'ar' ? 'اختر التاريخ' : 'Choisir une date'}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        locale={locale}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
