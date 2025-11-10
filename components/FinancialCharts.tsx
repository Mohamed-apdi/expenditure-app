// components/FinancialCharts.tsx
import { View, Text } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

interface MonthlyData {
  month: string;
  amount: number;
}

export const SpendingByCategoryChart = ({ data }: { data: CategoryData[] }) => {
  const chartData = data.map((item: CategoryData) => ({
    name: item.category,
    amount: item.amount,
    color: item.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  return (
    <View className="mb-6">
      <Text className="font-bold text-lg mb-2 ml-4">Spending by Category</Text>
      <PieChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="amount"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
};

export const MonthlyTrendChart = ({ data }: { data: MonthlyData[] }) => {
  return (
    <View className="mb-6">
      <Text className="font-bold text-lg mb-2 ml-4">Monthly Trends</Text>
      <BarChart
        data={{
          labels: data.map((item: MonthlyData) => item.month),
          datasets: [
            {
              data: data.map((item: MonthlyData) => item.amount),
            },
          ],
        }}
        width={screenWidth - 32}
        height={220}
        yAxisLabel="$"
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    </View>
  );
};
