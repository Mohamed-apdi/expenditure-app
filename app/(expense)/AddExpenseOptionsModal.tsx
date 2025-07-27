import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Camera, Edit3, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function AddExpenseOptionsModal({ visible, onClose }: Props) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 p-6 rounded-t-3xl border-t border-slate-700">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">Add Expense</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="flex-row items-center bg-slate-800 p-4 rounded-xl mb-4 border border-slate-700"
            onPress={() => {
              onClose();
              router.push('/(expense)/ReceiptScanner');
            }}
          >
            <Camera size={20} color="#10b981" />
            <Text className="text-white font-semibold ml-3">Scan Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700"
            onPress={() => {
              onClose();
              router.push('/(expense)/AddExpense');
            }}
          >
            <Edit3 size={20} color="#3b82f6" />
            <Text className="text-white font-semibold ml-3">Enter Manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
