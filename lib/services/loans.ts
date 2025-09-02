import { supabase } from "../database/supabase";
import { PersonalLoan, LoanRepayment } from "../types/types";

// Helper function to update account balance
async function updateAccountBalance(accountId: string, amountChange: number) {
  try {
    const { data: account, error: fetchError } = await supabase
      .from("accounts")
      .select("amount")
      .eq("id", accountId)
      .single();

    if (fetchError) throw fetchError;

    const newBalance = (account.amount || 0) + amountChange;

    const { error: updateError } = await supabase
      .from("accounts")
      .update({ amount: newBalance })
      .eq("id", accountId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error("Error updating account balance:", error);
    throw error;
  }
}

// Get all loans for a user
export async function getUserLoans(userId: string): Promise<PersonalLoan[]> {
  try {
    const { data, error } = await supabase
      .from("personal_loans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching loans:", error);
    throw error;
  }
}

// Get a specific loan by ID
export async function getLoanById(
  loanId: string
): Promise<PersonalLoan | null> {
  try {
    const { data, error } = await supabase
      .from("personal_loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching loan:", error);
    throw error;
  }
}

// Create a new loan
export async function createLoan(
  loan: Omit<PersonalLoan, "id" | "created_at" | "updated_at">
): Promise<PersonalLoan> {
  try {
    const { data, error } = await supabase
      .from("personal_loans")
      .insert(loan)
      .select()
      .single();

    if (error) throw error;

    // Update account balance based on loan type
    if (loan.account_id) {
      let balanceChange = 0;
      if (loan.type === "loan_taken") {
        // When taking a loan, money comes INTO the account
        balanceChange = loan.principal_amount;
      } else if (loan.type === "loan_given") {
        // When giving a loan, money goes OUT of the account
        balanceChange = -loan.principal_amount;
      }

      if (balanceChange !== 0) {
        await updateAccountBalance(loan.account_id, balanceChange);
      }
    }

    return data;
  } catch (error) {
    console.error("Error creating loan:", error);
    throw error;
  }
}

// Update a loan
export async function updateLoan(
  loanId: string,
  updates: Partial<PersonalLoan>
): Promise<PersonalLoan> {
  try {
    // Get the current loan to calculate balance changes
    const currentLoan = await getLoanById(loanId);
    if (!currentLoan) throw new Error("Loan not found");

    // Calculate balance changes for the old loan
    let oldBalanceChange = 0;
    if (currentLoan.account_id) {
      if (currentLoan.type === "loan_taken") {
        oldBalanceChange = currentLoan.principal_amount;
      } else if (currentLoan.type === "loan_given") {
        oldBalanceChange = -currentLoan.principal_amount;
      }
    }

    // Calculate balance changes for the new loan
    let newBalanceChange = 0;
    if (updates.account_id) {
      if (updates.type === "loan_taken") {
        newBalanceChange =
          updates.principal_amount || currentLoan.principal_amount;
      } else if (updates.type === "loan_given") {
        newBalanceChange = -(
          updates.principal_amount || currentLoan.principal_amount
        );
      }
    }

    // Update the loan
    const { data, error } = await supabase
      .from("personal_loans")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    // Update account balances
    if (currentLoan.account_id && oldBalanceChange !== 0) {
      // Reverse the old loan's effect
      await updateAccountBalance(currentLoan.account_id, -oldBalanceChange);
    }

    if (updates.account_id && newBalanceChange !== 0) {
      // Apply the new loan's effect
      await updateAccountBalance(updates.account_id, newBalanceChange);
    }

    return data;
  } catch (error) {
    console.error("Error updating loan:", error);
    throw error;
  }
}

// Delete a loan
export async function deleteLoan(loanId: string): Promise<void> {
  try {
    // Get the loan to calculate balance changes
    const loan = await getLoanById(loanId);
    if (!loan) throw new Error("Loan not found");

    // Delete the loan
    const { error } = await supabase
      .from("personal_loans")
      .delete()
      .eq("id", loanId);

    if (error) throw error;

    // Reverse the account balance change
    if (loan.account_id) {
      let balanceChange = 0;
      if (loan.type === "loan_taken") {
        // When deleting a taken loan, money goes OUT of the account
        balanceChange = -loan.remaining_amount;
      } else if (loan.type === "loan_given") {
        // When deleting a given loan, money comes back INTO the account
        balanceChange = loan.remaining_amount;
      }

      if (balanceChange !== 0) {
        await updateAccountBalance(loan.account_id, balanceChange);
      }
    }
  } catch (error) {
    console.error("Error deleting loan:", error);
    throw error;
  }
}

// Get repayments for a loan
export async function getLoanRepayments(
  loanId: string
): Promise<LoanRepayment[]> {
  try {
    const { data, error } = await supabase
      .from("loan_repayments")
      .select("*")
      .eq("loan_id", loanId)
      .order("payment_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching repayments:", error);
    throw error;
  }
}

// Create a repayment
export async function createRepayment(
  repayment: Omit<LoanRepayment, "id" | "created_at">
): Promise<LoanRepayment> {
  try {
    // First check if the loan exists and has remaining amount
    const loan = await getLoanById(repayment.loan_id);
    if (!loan) {
      throw new Error("Loan not found");
    }

    // Check if there's any remaining amount to repay
    if (loan.remaining_amount <= 0) {
      throw new Error("Loan is already fully repaid");
    }

    // Check if repayment amount exceeds remaining amount
    if (repayment.amount > loan.remaining_amount) {
      throw new Error("Repayment amount cannot exceed remaining amount");
    }

    const { data, error } = await supabase
      .from("loan_repayments")
      .insert(repayment)
      .select()
      .single();

    if (error) throw error;

    // Update account balance based on loan type
    if (loan.account_id) {
      let balanceChange = 0;
      if (loan.type === "loan_taken") {
        // When repaying a taken loan, money goes OUT of the account
        balanceChange = -repayment.amount;
      } else if (loan.type === "loan_given") {
        // When receiving repayment for a given loan, money comes INTO the account
        balanceChange = repayment.amount;
      }

      if (balanceChange !== 0) {
        await updateAccountBalance(loan.account_id, balanceChange);
      }
    }

    // Update the remaining amount on the loan
    const newRemainingAmount = loan.remaining_amount - repayment.amount;
    const newStatus =
      newRemainingAmount <= 0
        ? "settled"
        : newRemainingAmount < loan.principal_amount
          ? "partial"
          : "active";

    await updateLoan(repayment.loan_id, {
      remaining_amount: Math.max(0, newRemainingAmount),
      status: newStatus,
    });

    return data;
  } catch (error) {
    console.error("Error creating repayment:", error);
    throw error;
  }
}

// Delete a repayment
export async function deleteRepayment(repaymentId: string): Promise<void> {
  try {
    // First get the repayment to know the amount and loan_id
    const { data: repayment, error: fetchError } = await supabase
      .from("loan_repayments")
      .select("*")
      .eq("id", repaymentId)
      .single();

    if (fetchError) throw fetchError;

    // Get the loan to calculate balance changes
    const loan = await getLoanById(repayment.loan_id);
    if (!loan) throw new Error("Loan not found");

    // Delete the repayment
    const { error: deleteError } = await supabase
      .from("loan_repayments")
      .delete()
      .eq("id", repaymentId);

    if (deleteError) throw deleteError;

    // Reverse the account balance change
    if (loan.account_id) {
      let balanceChange = 0;
      if (loan.type === "loan_taken") {
        // When deleting a repayment for a taken loan, money comes back INTO the account
        balanceChange = repayment.amount;
      } else if (loan.type === "loan_given") {
        // When deleting a repayment for a given loan, money goes OUT of the account
        balanceChange = -repayment.amount;
      }

      if (balanceChange !== 0) {
        await updateAccountBalance(loan.account_id, balanceChange);
      }
    }

    // Recalculate the remaining amount on the loan
    const newRemainingAmount = loan.remaining_amount + repayment.amount;
    const newStatus =
      newRemainingAmount >= loan.principal_amount
        ? "active"
        : newRemainingAmount > 0
          ? "partial"
          : "settled";

    await updateLoan(repayment.loan_id, {
      remaining_amount: newRemainingAmount,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error deleting repayment:", error);
    throw error;
  }
}
