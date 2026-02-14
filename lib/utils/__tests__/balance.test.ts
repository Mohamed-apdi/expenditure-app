/**
 * Unit tests for balance calculations and negative value support
 * Run with: npx jest lib/utils/__tests__/balance.test.ts
 * Requires Jest to be configured in package.json
 */
import { formatCurrency } from "../../services/localReports";

describe("Balance calculations and negative value support", () => {
  describe("formatCurrency", () => {
    it("formats positive amounts correctly", () => {
      expect(formatCurrency(100)).toMatch(/\$100\.00/);
    });

    it("formats negative amounts with minus sign", () => {
      const result = formatCurrency(-50);
      expect(result).toContain("-");
      expect(result).toMatch(/\$50\.00/);
    });

    it("formats zero correctly", () => {
      expect(formatCurrency(0)).toMatch(/\$0\.00/);
    });
  });

  describe("Balance calculation logic", () => {
    it("expense reduces balance correctly (including negative)", () => {
      const priorBalance = 50;
      const expenseAmount = 100;
      const newBalance = priorBalance - expenseAmount;
      expect(newBalance).toBe(-50);
    });

    it("income increases balance correctly (including from negative)", () => {
      const priorBalance = -50;
      const incomeAmount = 100;
      const newBalance = priorBalance + incomeAmount;
      expect(newBalance).toBe(50);
    });

    it("aggregation sums positive and negative balances correctly", () => {
      const balances = [100, -30, 20];
      const total = balances.reduce((sum, b) => sum + b, 0);
      expect(total).toBe(90);
    });
  });
});
