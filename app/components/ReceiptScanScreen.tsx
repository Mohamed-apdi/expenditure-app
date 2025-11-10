// screens/ReceiptScanScreen.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Camera, Image as ImageIcon, X, Check, RotateCw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface ExtractedData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

export default function ReceiptScanScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call your OCR API or function here
      // For now, we'll mock the response
      setTimeout(() => {
        setExtractedData({
          merchant: 'Local Grocery Store',
          amount: 45.32,
          date: new Date().toISOString().split('T')[0],
          category: 'Groceries',
        });
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
    }
  };

  const resetScan = () => {
    setImage(null);
    setExtractedData(null);
  };

  return (
    <View className="flex-1 p-4 bg-gray-50">
      {!image ? (
        <View className="flex-1 justify-center items-center">
          <View className="mb-8 p-6 bg-blue-50 rounded-full">
            <Camera size={40} color="#3b82f6" />
          </View>
          <Text className="text-xl font-bold mb-2">Scan Receipt</Text>
          <Text className="text-gray-500 text-center mb-8">
            Take a photo of your receipt or upload from your gallery to
            automatically extract transaction details.
          </Text>
          <View className="w-full space-y-3">
            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-lg items-center"
              onPress={takePhoto}
            >
              <Text className="text-white font-medium">Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-white py-3 rounded-lg items-center border border-gray-200"
              onPress={pickImage}
            >
              <Text className="text-gray-800 font-medium">Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : isProcessing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-500">Processing receipt...</Text>
        </View>
      ) : extractedData ? (
        <View className="flex-1">
          <View className="bg-white p-4 rounded-xl mb-4">
            <Image
              source={{ uri: image }}
              className="w-full h-48 rounded-lg mb-4"
              resizeMode="contain"
            />
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-500">Merchant</Text>
                <Text className="font-medium">{extractedData.merchant}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500">Amount</Text>
                <Text className="font-medium">${extractedData.amount.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500">Date</Text>
                <Text className="font-medium">
                  {new Date(extractedData.date).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500">Category</Text>
                <Text className="font-medium">{extractedData.category}</Text>
              </View>
            </View>
          </View>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-gray-200 py-3 rounded-lg items-center flex-row justify-center"
              onPress={resetScan}
            >
              <RotateCw size={18} color="#4b5563" className="mr-2" />
              <Text className="text-gray-800 font-medium">Rescan</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-blue-500 py-3 rounded-lg items-center flex-row justify-center">
              <Check size={18} color="white" className="mr-2" />
              <Text className="text-white font-medium">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <Image
            source={{ uri: image }}
            className="w-full h-64 rounded-lg mb-4"
            resizeMode="contain"
          />
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
              onPress={resetScan}
            >
              <Text className="text-gray-800 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-blue-500 py-3 rounded-lg items-center"
              onPress={() => processImage(image)}
            >
              <Text className="text-white font-medium">Process</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
