import { supabase } from "./supabase";
import { PersonalLoan, LoanRepayment } from "./types";
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  getTransactionsByAccount,
} from "./transactions";

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

      // Create corresponding transaction record
      const transactionType = loan.type === "loan_taken" ? "income" : "expense";
      const transactionDescription =
        loan.type === "loan_taken"
          ? `Loan taken from ${loan.party_name}`
          : `Loan given to ${loan.party_name}`;

      await addTransaction({
        user_id: loan.user_id,
        account_id: loan.account_id,
        amount: loan.principal_amount,
        description: transactionDescription,
        date: new Date().toISOString().split("T")[0], // Today's date
        category: "Loans", // Loan category
        is_recurring: false,
        type: transactionType,
      });
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

    // Update the corresponding transaction
    if (currentLoan.account_id) {
      try {
        const transactions = await getTransactionsByAccount(
          currentLoan.user_id,
          currentLoan.account_id
        );

        // Find the transaction that matches this loan
        const expectedDescription =
          currentLoan.type === "loan_taken"
            ? `Loan taken from ${currentLoan.party_name}`
            : `Loan given to ${currentLoan.party_name}`;

        const loanTransaction = transactions.find(
          (transaction) =>
            transaction.description === expectedDescription &&
            transaction.amount === currentLoan.principal_amount &&
            transaction.category === "Loans"
        );

        if (loanTransaction) {
          // Update the transaction with new loan details
          const updatedLoan = data; // The updated loan data
          const newTransactionType =
            updatedLoan.type === "loan_taken" ? "income" : "expense";
          const newTransactionDescription =
            updatedLoan.type === "loan_taken"
              ? `Loan taken from ${updatedLoan.party_name}`
              : `Loan given to ${updatedLoan.party_name}`;

          await updateTransaction(loanTransaction.id, {
            account_id: updatedLoan.account_id,
            amount: updatedLoan.principal_amount,
            description: newTransactionDescription,
            type: newTransactionType,
          });
        }
      } catch (transactionError) {
        console.warn(
          "Could not find or update loan transaction:",
          transactionError
        );
        // Don't fail the loan update if transaction update fails
      }
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

    // Find and delete the corresponding transaction
    if (loan.account_id) {
      try {
        console.log(
          `Searching for transaction to delete for loan: ${loan.id}, party: ${loan.party_name}, amount: ${loan.principal_amount}`
        );

        const transactions = await getTransactionsByAccount(
          loan.user_id,
          loan.account_id
        );

        // Find the transaction that matches this loan
        const expectedDescription =
          loan.type === "loan_taken"
            ? `Loan taken from ${loan.party_name}`
            : `Loan given to ${loan.party_name}`;

        console.log(
          `Looking for transaction with description: "${expectedDescription}", amount: ${loan.principal_amount}, category: "Loans"`
        );

        const loanTransaction = transactions.find(
          (transaction) =>
            transaction.description === expectedDescription &&
            transaction.amount === loan.principal_amount &&
            transaction.category === "Loans"
        );

        if (loanTransaction) {
          console.log(
            `Found matching transaction with ID: ${loanTransaction.id}. Deleting...`
          );
          await deleteTransaction(loanTransaction.id);
          console.log(
            `Successfully deleted transaction: ${loanTransaction.id}`
          );
        } else {
          console.warn(
            `No matching transaction found for loan ${loan.id}. Available transactions:`,
            transactions
              .filter((t) => t.category === "Loans")
              .map((t) => ({
                id: t.id,
                description: t.description,
                amount: t.amount,
                category: t.category,
              }))
          );
        }
      } catch (transactionError) {
        console.error(
          "Error finding or deleting loan transaction:",
          transactionError
        );
        // Don't fail the loan deletion if transaction deletion fails
      }
    }

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

      // Create transaction for the repayment
      const transactionType = loan.type === "loan_taken" ? "expense" : "income";
      const transactionDescription =
        loan.type === "loan_taken"
          ? `Loan repayment to ${loan.party_name}`
          : `Loan repayment received from ${loan.party_name}`;

      await addTransaction({
        user_id: loan.user_id,
        account_id: loan.account_id,
        amount: repayment.amount,
        description: transactionDescription,
        date: repayment.payment_date,
        category: "Loan Repayments",
        is_recurring: false,
        type: transactionType,
      });
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

    // Find and delete the corresponding repayment transaction
    if (loan.account_id) {
      try {
        const transactions = await getTransactionsByAccount(
          loan.user_id,
          loan.account_id
        );

        // Find the transaction that matches this repayment
        const expectedDescription =
          loan.type === "loan_taken"
            ? `Loan repayment to ${loan.party_name}`
            : `Loan repayment received from ${loan.party_name}`;

        const repaymentTransaction = transactions.find(
          (transaction) =>
            transaction.description === expectedDescription &&
            transaction.amount === repayment.amount &&
            transaction.category === "Loan Repayments" &&
            transaction.date === repayment.payment_date
        );

        if (repaymentTransaction) {
          await deleteTransaction(repaymentTransaction.id);
        }
      } catch (transactionError) {
        console.warn(
          "Could not find or delete repayment transaction:",
          transactionError
        );
        // Don't fail the repayment deletion if transaction deletion fails
      }

      // Reverse the account balance change
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
