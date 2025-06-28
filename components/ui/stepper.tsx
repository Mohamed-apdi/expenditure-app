import React from "react";
import { View, Text } from "react-native";
import { cn } from "~/lib/utils";
import { Check, Circle } from "lucide-react-native";

interface StepperProps {
  steps: number;
  currentStep: number;
  className?: string;
}

export const Steppers = ({ steps, currentStep, className }: StepperProps) => {
  return (
    <View className={cn("gap-4", className)}>
      <View className="flex-row justify-between">
        {Array.from({ length: steps }).map((_, index) => (
          <View key={index} className="items-center gap-1">
            <View className={cn(
              "h-8 w-8 items-center justify-center rounded-full",
              currentStep > index ? "bg-primary" : currentStep === index ? "bg-primary/20" : "bg-muted"
            )}>
              {currentStep > index ? (
                <Check size={16} className="text-primary-foreground" />
              ) : (
                <Text className={cn(
                  "text-base font-medium",
                  currentStep === index ? "text-primary" : "text-muted-foreground"
                )}>
                  {index + 1}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
      <View className="h-1.5 rounded-full bg-muted">
        <View 
          className="h-full rounded-full bg-primary" 
          style={{ width: `${(currentStep + 1) / steps * 100}%` }}
        />
      </View>
    </View>
  );
};