import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Alert, Pressable, Image } from 'react-native';
import { Calendar, Clock, Plus, X, Trash2, DollarSign } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define service icons
type ServiceIcon = 'streaming' | 'fitness' | 'music' | 'software' | 'cloud' | 'education' | 'gaming' | 'other';

// Mock the icons - replace with your actual assets
const serviceIcons = {
  streaming: require('../../assets/subscription_icons/YouTube.png'),
  fitness: require('../../assets/subscription_icons/Muscle.png'),
  music: require('../../assets/subscription_icons/Spotify.png'),
  software: require('../../assets/subscription_icons/Code.png'),
  cloud: require('../../assets/subscription_icons/Cloud Database.png'),
  education: require('../../assets/subscription_icons/Graduation Cap.png'),
  gaming: require('../../assets/subscription_icons/Game Controller.png'),
  other: require('../../assets/subscription_icons/View More.png'),
};

const colors = [
  "#FFCCCB", "#ADD8E6", "#FFD580", "#90EE90", 
  "#E6E6FA", "#FFB6C1", "#FFFF99", "#B0E0E6"
];

const getDefaultIcon = (serviceName: string): ServiceIcon => {
  const name = serviceName.toLowerCase();
  if (name.includes('netflix') || name.includes('hulu') || name.includes('disney')) return 'streaming';
  if (name.includes('gym') || name.includes('fitness')) return 'fitness';
  if (name.includes('spotify') || name.includes('apple music')) return 'music';
  if (name.includes('adobe') || name.includes('microsoft')) return 'software';
  if (name.includes('dropbox') || name.includes('google')) return 'cloud';
  return 'other';
};

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState([
    {
      id: '1',
      name: 'Netflix',
      amount: 14.99,
      cycle: 'Monthly',
      nextPayment: '2023-07-15',
      active: true,
      icon: 'streaming' as ServiceIcon,
      iconColor: "#FFCCCB",
    },
    {
      id: '2',
      name: 'Gym Membership',
      amount: 45.0,
      cycle: 'Monthly',
      nextPayment: '2023-07-01',
      active: true,
      icon: 'fitness' as ServiceIcon,
      iconColor: "#90EE90",
    },
    {
      id: '3',
      name: 'Spotify',
      amount: 9.99,
      cycle: 'Monthly',
      nextPayment: '2023-07-20',
      active: false,
      icon: 'music' as ServiceIcon,
      iconColor: "#B0E0E6",
    },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isIconModalVisible, setIsIconModalVisible] = useState(false);
  const [isColorModalVisible, setIsColorModalVisible] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    cycle: 'Monthly',
    nextPayment: '',
    active: true,
    icon: 'other' as ServiceIcon,
    iconColor: colors[0],
  });

  const cycles = ['Weekly', 'Monthly', 'Yearly'];

  const toggleSubscription = (id: string) => {
    setSubscriptions(
      subscriptions.map((sub) =>
        sub.id === id ? { ...sub, active: !sub.active } : sub
      )
    );
  };

  const openAddModal = () => {
    setCurrentSubscription(null);
    setFormData({
      name: '',
      amount: '',
      cycle: 'Monthly',
      nextPayment: '',
      active: true,
      icon: 'other',
      iconColor: colors[0],
    });
    setIsEditMode(false);
    setIsModalVisible(true);
  };

  const openEditModal = (subscription) => {
    setCurrentSubscription(subscription);
    setFormData({
      name: subscription.name,
      amount: subscription.amount.toString(),
      cycle: subscription.cycle,
      nextPayment: subscription.nextPayment,
      active: subscription.active,
      icon: subscription.icon,
      iconColor: subscription.iconColor,
    });
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.amount || !formData.nextPayment) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount) || 0;
    const subscriptionData = {
      name: formData.name,
      amount,
      cycle: formData.cycle,
      nextPayment: formData.nextPayment,
      active: formData.active,
      icon: formData.icon,
      iconColor: formData.iconColor,
    };

    if (isEditMode && currentSubscription) {
      setSubscriptions(subscriptions.map(s => 
        s.id === currentSubscription.id ? { ...s, ...subscriptionData } : s
      ));
    } else {
      const newSubscription = {
        id: Date.now().toString(),
        ...subscriptionData,
        icon: formData.icon || getDefaultIcon(formData.name),
        iconColor: formData.iconColor || colors[0],
      };
      setSubscriptions([...subscriptions, newSubscription]);
    }

    setIsModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Subscription',
      'Are you sure you want to delete this subscription?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setSubscriptions(subscriptions.filter(s => s.id !== id))
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const selectIcon = (icon: ServiceIcon) => {
    setFormData({ ...formData, icon });
    setIsIconModalVisible(false);
  };

  const selectColor = (color: string) => {
    setFormData({ ...formData, iconColor: color });
    setIsColorModalVisible(false);
  };

  return (
    <View>
      <ScrollView className="flex-1 p-4">
        <View>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="font-bold text-xl text-gray-900">Active Subscriptions</Text>
            <TouchableOpacity 
              className="bg-blue-600 p-3 rounded-full shadow"
              onPress={openAddModal}
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>

          {subscriptions.filter(sub => sub.active).length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-500 text-lg">No active subscriptions</Text>
            </View>
          ) : (
            subscriptions
              .filter((sub) => sub.active)
              .map((subscription) => (
                <Pressable
                  key={subscription.id}
                  className="mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100"
                  onPress={() => openEditModal(subscription)}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center flex-1">
                      <View className="p-2 rounded-full mr-3" style={{ backgroundColor: subscription.iconColor }}>
                        <Image source={serviceIcons[subscription.icon]} className="w-6 h-6" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900 text-lg">{subscription.name}</Text>
                        <View className="flex-row items-center mt-1">
                          <Calendar size={14} color="#6b7280"/>
                          <Text className="text-gray-500 text-sm ml-2">
                            {subscription.cycle} • Due {formatDate(subscription.nextPayment)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-medium text-gray-900 mr-1">
                        ${subscription.amount.toFixed(2)}
                      </Text>
                      <Switch
                        value={subscription.active}
                        onValueChange={() => toggleSubscription(subscription.id)}
                        trackColor={{ false: '#767577', true: '#3b82f6' }}
                        thumbColor={subscription.active ? '#f4f3f4' : '#f4f3f4'}
                      />
                    </View>
                  </View>
                </Pressable>
              ))
          )}
        </View>

        <View className="bg-white p-6 rounded-2xl shadow-sm">
          <Text className="font-bold text-xl text-gray-900 mb-6">Inactive Subscriptions</Text>
          {subscriptions.filter(sub => !sub.active).length === 0 ? (
            <View className="py-4 items-center">
              <Text className="text-gray-500 text-lg">No inactive subscriptions</Text>
            </View>
          ) : (
            subscriptions
              .filter((sub) => !sub.active)
              .map((subscription) => (
                <Pressable
                  key={subscription.id}
                  className="mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100 opacity-80"
                  onPress={() => openEditModal(subscription)}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center flex-1">
                      <View className="p-2 rounded-full mr-3" style={{ backgroundColor: subscription.iconColor }}>
                        <Image source={serviceIcons[subscription.icon]} className="w-6 h-6" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900 text-lg">{subscription.name}</Text>
                        <View className="flex-row items-center mt-1">
                          <Clock size={14} color="#6b7280"/>
                          <Text className="text-gray-500 text-sm ml-2">
                            {subscription.cycle} • Paused
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-medium text-gray-900 mr-1">
                        ${subscription.amount.toFixed(2)}
                      </Text>
                      <Switch
                        value={subscription.active}
                        onValueChange={() => toggleSubscription(subscription.id)}
                        trackColor={{ false: '#767577', true: '#3b82f6' }}
                        thumbColor={subscription.active ? '#f4f3f4' : '#f4f3f4'}
                        className="mt-1"
                      />
                    </View>
                  </View>
                </Pressable>
              ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Subscription Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">
                {isEditMode ? 'Edit Subscription' : 'New Subscription'}
              </Text>
              <View className='flex-row justify-center items-center gap-2'>
                {isEditMode ? (
                 <TouchableOpacity 
                    className="p-2"
                    onPress={(e) => {
                      e.stopPropagation && e.stopPropagation();
                      handleDelete(subscription.id);
                    }}
                  >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
                ):""}
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
              </View>
            </View>

            <View className="space-y-5">
              {/* Icon and Color Selection */}
              <View className="flex-row space-x-4 gap-2 items-center">
                <View className="flex-1">
                  <Text className="text-gray-700 mb-2 font-medium">Icon</Text>
                  <TouchableOpacity 
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row items-center"
                    onPress={() => setIsIconModalVisible(true)}
                  >
                    <View className="rounded-full mr-3" style={{ backgroundColor: formData.iconColor }}>
                      <Image source={serviceIcons[formData.icon]} className="w-6 h-6" />
                    </View>
                    <Text className="text-gray-900">Change Icon</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 mb-2 font-medium">Color</Text>
                  <TouchableOpacity 
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row items-center"
                    onPress={() => setIsColorModalVisible(true)}
                  >
                    <View className="w-6 h-6 rounded-full mr-3" style={{ backgroundColor: formData.iconColor }} />
                    <Text className="text-gray-900">Change Color</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Service Name</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                  placeholder="e.g., Netflix, Spotify"
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Amount</Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                  <View className="px-4">
                    <DollarSign size={18} color="#6b7280" />
                  </View>
                  <TextInput
                    className="flex-1 p-4"
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({...formData, amount: text})}
                  />
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Billing Cycle</Text>
                <View className="flex-row gap-2 mb-1">
                  {cycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle}
                      className={`px-4 py-2 rounded-lg ${formData.cycle === cycle ? 'bg-blue-600' : 'bg-gray-200'}`}
                      onPress={() => setFormData({...formData, cycle})}
                    >
                      <Text className={formData.cycle === cycle ? 'text-white font-medium' : 'text-gray-800'}>
                        {cycle}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Next Payment Date</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                  placeholder="YYYY-MM-DD"
                  value={formData.nextPayment}
                  onChangeText={(text) => setFormData({...formData, nextPayment: text})}
                />
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 font-medium">Active</Text>
                <Switch
                  value={formData.active}
                  onValueChange={(value) => setFormData({...formData, active: value})}
                  trackColor={{ false: '#767577', true: '#3b82f6' }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 p-4 rounded-xl items-center mt-2"
                onPress={handleSave}
              >
                <Text className="text-white font-medium text-lg">
                  {isEditMode ? 'Update' : 'Add Subscription'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon Selection Modal */}
      <Modal
        visible={isIconModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsIconModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">Select Icon</Text>
              <TouchableOpacity onPress={() => setIsIconModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {Object.keys(serviceIcons).map((icon) => (
                <TouchableOpacity
                  key={icon}
                  className={`w-1/4 p-4 items-center ${formData.icon === icon ? 'bg-blue-50 rounded-lg' : ''}`}
                  onPress={() => selectIcon(icon as ServiceIcon)}
                >
                  <View className="p-3 rounded-full mb-2" style={{ backgroundColor: formData.iconColor }}>
                    <Image source={serviceIcons[icon]} className="w-8 h-8" />
                  </View>
                  <Text className="text-xs text-gray-700 capitalize">{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Selection Modal */}
      <Modal
        visible={isColorModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsColorModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">Select Color</Text>
              <TouchableOpacity onPress={() => setIsColorModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  className={`w-1/4 p-4 items-center ${formData.iconColor === color ? 'bg-blue-50 rounded-lg' : ''}`}
                  onPress={() => selectColor(color)}
                >
                  <View className="w-10 h-10 rounded-full mb-2" style={{ backgroundColor: color }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}