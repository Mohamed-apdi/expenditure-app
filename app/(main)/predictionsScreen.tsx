import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { predictExpenditure } from "~/lib/api"; // <-- backend call

const defaultValues = {
  exp_food: 0,
  exp_nfnd: 0,
  exp_rent: 0,
  pce: 0,
  pcer: 0,
  poor: 0,
  cr15_04quantity: 0,
  cr15_05quantity: 0,
  cr15_06: 0,
  cr15_10: 0,
  hhsize: 1,
  region_n: 1,
  hh_water_type: 1,
  hh_electricity: 1,
  foodsec7_07: 1,
  remt9_11: 0,
  liv4_21: 0,
  liv4_22: 0,
  liv4_24: 0,
  liv4_25: 0,
  liv4_04: 0,
  liv4_12: 0,
  liv4_13: 0,
  nfe16_33: 0,
  nfe16_13: 0,
  shock10_03: 0,
  shock10_04: 0,
  shock10_07_21: 0,
  shock10_07_23: 0,
  log_exp_food: 0,
  log_exp_nfnd: 0,
  log_exp_rent: 0,

};

export default function PredictScreen() {
  const [form, setForm] = useState(defaultValues);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
      ...form,
      log_exp_food: Math.log1p(form.exp_food),
      log_exp_nfnd: Math.log1p(form.exp_nfnd),
      log_exp_rent: Math.log1p(form.exp_rent),
    };
      const res = await predictExpenditure(payload);
      console.log("Prediction response:", res);
      setResult(res.predicted_expenditure);
    } catch (err: any) {
      console.error("Prediction error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 py-6">
      <Text className="text-white text-xl mb-4">Predict Expenditure</Text>

      {(Object.keys(form) as (keyof typeof form)[]).filter((key) => !key.startsWith("log_exp_")).map((key) => (
        <View key={key} className="mb-4">
          <Text className="text-white mb-1">{key}</Text>
          <TextInput
            value={form[key].toString()}
            onChangeText={(val) => handleChange(key, val)}
            keyboardType="numeric"
            className="bg-slate-800 text-white rounded-lg px-3 py-2"
          />
        </View>
      ))}

      <Button onPress={handleSubmit} disabled={loading}>
        <Text className="text-black">{loading ? "Predicting..." : "Predict"}</Text>
      </Button>

      {result !== null && (
        <Text className="text-emerald-400 mt-6 text-lg">
          Prediction: ${result}
        </Text>
      )}
    </ScrollView>
  );
}
