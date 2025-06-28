import React from "react";
import { View, Text, TextInput } from "react-native";
import { cn } from "~/lib/utils";
import { LucideIcon } from "lucide-react-native";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: LucideIcon;
  type?: "text" | "currency";
  placeholder?: string;
  className?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, value, onChangeText, icon: Icon, type = "text", placeholder = "", className }, ref) => {
    return (
      <View className={cn("gap-1", className)}>
        <Text className="text-sm font-medium text-foreground">{label}</Text>
        <View className="flex-row items-center rounded-md border border-input bg-background px-3 py-2">
          {type === "currency" && <Text className="text-muted-foreground mr-1">$</Text>}
          {Icon && <Icon size={16} className="text-muted-foreground mr-2" />}
          <TextInput
            ref={ref}
            className="flex-1 text-foreground text-base"
            value={value}
            onChangeText={onChangeText}
            keyboardType={type === "currency" ? "numeric" : "default"}
            placeholder={placeholder}
            placeholderTextColor="#64748b"
          />
        </View>
      </View>
    );
  }
);

Input.displayName = "Input";