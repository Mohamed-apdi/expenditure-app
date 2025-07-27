import { supabase } from "./supabase";


export const saveComparison = async (predictionId, comparisonData, results) => {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    // Calculate variance amount
    const varianceAmount = Math.abs(results.total_actual - results.total_predicted_monthly);

    const { data, error } = await supabase
      .from('comparisons')
      .insert({
        user_id: user.id,
        prediction_id: predictionId,
        comparison_mode: comparisonData.comparisonMode,
        period: results.period,
        expense_count: results.expenseCount,
        total_actual: results.total_actual,
        total_predicted: results.total_predicted_monthly,
        is_under_budget: results.isUnderBudget,
        variance_percentage: results.variance_percentage,
        variance_amount: varianceAmount,
        confidence_score: results.confidence_score,
        is_recurring_adjusted: results.is_recurring_adjusted,
        category_breakdown: results.category_breakdown,
        message: results.message,
        time_period_note: results.time_period_note,
        month: comparisonData.month || null,
        year: comparisonData.year || null,
        expense_ids: comparisonData.expenseIds || null
      })
      .select();

    if (error) throw error;
    return data[0];

  } catch (error) {
    console.error('Save comparison error:', error);
    throw error;
  }
};