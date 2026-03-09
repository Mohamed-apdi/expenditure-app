import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Plus,
  Wallet,
  ChevronDown,
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { getCurrentUserOfflineFirst } from '~/lib';
import { fetchAccounts, type Account } from '~/lib';
import { useTheme } from '~/lib';
import { useLanguage } from '~/lib';
import { triggerSync } from '~/lib/sync/legendSync';
import {
  selectInvestments,
  createInvestmentLocal,
  updateInvestmentLocal,
  deleteInvestmentLocal,
} from '~/lib/stores/investmentsStore';
import { selectAccounts, toAccount, updateAccountLocal } from '~/lib/stores/accountsStore';
import { createTransactionLocal } from '~/lib/stores/transactionsStore';
import type { LocalInvestment } from '~/lib/stores/storeUtils';

// Investment interface based on local store
interface Investment {
  id: string;
  user_id: string;
  account_id: string;
  type: string;
  name: string;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  created_at: string;
  updated_at: string;
  account?: Account;
}

function toDisplayInvestment(inv: LocalInvestment, accounts: Account[]): Investment {
  const profitLoss = inv.current_value - inv.invested_amount;
  const account = accounts.find((a) => a.id === inv.account_id);
  return {
    id: inv.id,
    user_id: inv.user_id,
    account_id: inv.account_id,
    type: inv.type,
    name: inv.name,
    invested_amount: inv.invested_amount,
    current_value: inv.current_value,
    profit_loss: profitLoss,
    created_at: inv.created_at,
    updated_at: inv.updated_at,
    account,
  };
}

interface InvestmentsProps {
  accounts?: Account[];
  userId?: string | null;
  onRefresh?: () => Promise<void>;
  /** When set (e.g. from Budget screen), show only investments for this account (same as Dashboard). */
  selectedAccountId?: string | null;
}

const Investments = ({
  accounts: propAccounts,
  userId: propUserId,
  onRefresh: propOnRefresh,
  selectedAccountId: propSelectedAccountId,
}: InvestmentsProps = {}) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts || []);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(propUserId || null);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [currentInvestment, setCurrentInvestment] = useState<Investment | null>(
    null,
  );
  const insets = useSafeAreaInsets();

  // FAB animation state (same pattern as Accounts)
  const [fabExpanded, setFabExpanded] = useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;

  const expandFab = () => {
    fabAnimation.setValue(1);
    setFabExpanded(true);
  };

  const collapseFab = () => {
    fabAnimation.setValue(0);
    setFabExpanded(false);
  };

  const handleFabPress = () => {
    if (fabExpanded) {
      openAddModal();
      collapseFab();
    } else {
      expandFab();
    }
  };

  // Form states
  const [newType, setNewType] = useState('');
  const [newName, setNewName] = useState('');
  const [newInvestedAmount, setNewInvestedAmount] = useState('');
  const [newCurrentValue, setNewCurrentValue] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  // Investment types (ensure labels are always strings for RN Text requirement)
  const investmentTypes = [
    { key: 'Stock', label: t.stock ?? 'Stock' },
    { key: 'Crypto', label: t.crypto ?? 'Crypto' },
    { key: 'Real Estate', label: t.realEstate ?? 'Real Estate' },
    { key: 'Bonds', label: t.bonds ?? 'Bonds' },
    { key: 'Mutual Funds', label: t.mutualFunds ?? 'Mutual Funds' },
    { key: 'ETF', label: t.etf ?? 'ETF' },
    { key: 'Commodities', label: t.commodities ?? 'Commodities' },
    { key: 'Other', label: t.other ?? 'Other' },
  ];

  // Get translated investment type label (ensure string for RN Text)
  const getInvestmentTypeLabel = (typeKey: string) => {
    const typeObj = investmentTypes.find((type) => type.key === typeKey);
    const label = typeObj?.label ?? typeKey;
    return typeof label === 'string' ? label : String(typeKey);
  };

  const fetchData = async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      setUserId(user.id);

      // Load from local stores (offline-first)
      const localInvestments = selectInvestments(user.id);
      const localAccounts = selectAccounts(user.id);
      const accountsForDisplay = localAccounts.map(toAccount);

      // Convert to display format
      const displayInvestments = localInvestments.map((inv) =>
        toDisplayInvestment(inv, accountsForDisplay)
      );

      setInvestments(displayInvestments);
      setAccounts(accountsForDisplay);

      // Set default selected account if available
      if (accountsForDisplay.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsForDisplay[0]);
      }

      // Trigger background sync to get latest data from server
      triggerSync().catch(console.error);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert(t.error, t.failedToFetchData);
    }
  };

  // Refresh data with pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Always fetch investments on mount; parent may pass accounts/userId for display sync but investments are never passed as props
  useEffect(() => {
    fetchData();
  }, []);

  // Sync with parent props when they change; respect selectedAccountId from app (e.g. Budget/Dashboard)
  useEffect(() => {
    if (propAccounts !== undefined) {
      setAccounts(propAccounts);
      if (propAccounts.length > 0) {
        if (propSelectedAccountId) {
          const match = propAccounts.find((a) => a.id === propSelectedAccountId);
          setSelectedAccount(match ?? propAccounts[0]);
        } else if (!selectedAccount) {
          setSelectedAccount(propAccounts[0]);
        }
      }
    }
  }, [propAccounts, propSelectedAccountId]);

  useEffect(() => {
    if (propUserId !== undefined && propUserId !== null) {
      setUserId(propUserId);
    }
  }, [propUserId]);

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert(t.noAccountsForInvestment, t.createAccountFirstForInvestment);
      return;
    }
    setCurrentInvestment(null);
    setNewType('');
    setNewName('');
    setNewInvestedAmount('');
    setNewCurrentValue('');
    setSelectedAccount(accounts[0]);
    setIsModalVisible(true);
  };

  const openEditModal = (investment: Investment) => {
    setCurrentInvestment(investment);
    setNewType(investment.type);
    setNewName(investment.name);
    setNewInvestedAmount(investment.invested_amount.toString());
    setNewCurrentValue(investment.current_value.toString());

    const investmentAccount =
      investment.account ||
      accounts.find((acc) => acc.id === investment.account_id);
    setSelectedAccount(investmentAccount || null);

    setIsModalVisible(true);
  };

  const handleSaveInvestment = async () => {
    if (
      !newType.trim() ||
      !newName.trim() ||
      !newInvestedAmount.trim() ||
      !newCurrentValue.trim()
    ) {
      Alert.alert(t.missingInvestmentInfo, t.pleaseFillAllInvestmentFields);
      return;
    }

    if (!selectedAccount) {
      Alert.alert(t.selectAccount, t.selectAccountForInvestment);
      return;
    }

    if (!userId) {
      Alert.alert(t.error, t.userNotAuthenticatedForInvestment);
      return;
    }

    try {
      const investedAmount = parseFloat(newInvestedAmount);
      const currentValue = parseFloat(newCurrentValue);
      const today = new Date().toISOString().split('T')[0];

      if (currentInvestment) {
        const previousInvestedAmount = currentInvestment.invested_amount;
        const amountDifference = investedAmount - previousInvestedAmount;

        const updated = updateInvestmentLocal(currentInvestment.id, {
          type: newType,
          name: newName,
          invested_amount: investedAmount,
          current_value: currentValue,
          account_id: selectedAccount.id,
        });

        if (updated) {
          const displayInv = toDisplayInvestment(updated, accounts);
          setInvestments((prev) =>
            prev.map((inv) => (inv.id === currentInvestment.id ? displayInv : inv)),
          );

          if (amountDifference !== 0) {
            if (amountDifference > 0) {
              createTransactionLocal({
                user_id: userId,
                account_id: selectedAccount.id,
                amount: amountDifference,
                description: `${newName} - ${t.additionalInvestment || 'Additional investment'}`,
                date: today,
                category: 'Investment',
                type: 'expense',
                is_recurring: false,
              });
              const newBalance = selectedAccount.amount - amountDifference;
              updateAccountLocal(selectedAccount.id, { amount: newBalance });
            } else {
              const returnAmount = Math.abs(amountDifference);
              createTransactionLocal({
                user_id: userId,
                account_id: selectedAccount.id,
                amount: returnAmount,
                description: `${newName} - ${t.investmentReduction || 'Investment reduction'}`,
                date: today,
                category: 'Investment',
                type: 'income',
                is_recurring: false,
              });
              const newBalance = selectedAccount.amount + returnAmount;
              updateAccountLocal(selectedAccount.id, { amount: newBalance });
            }
          }
        }
        Alert.alert(t.success, t.investmentUpdated);
      } else {
        const created = createInvestmentLocal({
          user_id: userId,
          account_id: selectedAccount.id,
          type: newType,
          name: newName,
          invested_amount: investedAmount,
          current_value: currentValue,
        });

        createTransactionLocal({
          user_id: userId,
          account_id: selectedAccount.id,
          amount: investedAmount,
          description: `${newName} - ${t.newInvestment || 'New investment'}`,
          date: today,
          category: 'Investment',
          type: 'expense',
          is_recurring: false,
        });

        const newBalance = selectedAccount.amount - investedAmount;
        updateAccountLocal(selectedAccount.id, { amount: newBalance });

        const displayInv = toDisplayInvestment(created, accounts);
        setInvestments((prev) => [displayInv, ...prev]);
        Alert.alert(t.success, t.investmentAdded);
      }
      setIsModalVisible(false);
      triggerSync().catch(console.error);
    } catch (error) {
      console.error('Error saving investment:', error);
      Alert.alert(t.error, t.investmentSaveError);
    }
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    Alert.alert(t.deleteInvestment, t.deleteInvestmentConfirmation, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete locally (soft delete)
            deleteInvestmentLocal(investmentId);

            setInvestments((prev) =>
              prev.filter((inv) => inv.id !== investmentId),
            );
            Alert.alert(t.success, t.investmentDeleted);
            // Trigger sync to push deletion to server
            triggerSync().catch(console.error);
          } catch (error) {
            console.error('Error deleting investment:', error);
            Alert.alert(t.error, t.investmentDeleteError);
          }
        },
      },
    ]);
  };

  const getProfitLossColor = (profitLoss: number) => {
    if (profitLoss > 0) return theme.success; // Green
    if (profitLoss < 0) return theme.danger; // Red
    return theme.textSecondary; // Gray
  };

  const getProfitLossIcon = (profitLoss: number) => {
    if (profitLoss > 0) return <TrendingUp size={16} color={theme.success} />;
    if (profitLoss < 0) return <TrendingDown size={16} color={theme.danger} />;
    return <BarChart3 size={16} color={theme.textSecondary} />;
  };

  // Filter by selected account when provided (same as Dashboard)
  const investmentsForAccount = propSelectedAccountId
    ? investments.filter((inv) => inv.account_id === propSelectedAccountId)
    : investments;

  // Calculate total portfolio value (for displayed account when filtered)
  const totalInvested = investmentsForAccount.reduce(
    (sum, inv) => sum + inv.invested_amount,
    0,
  );
  const totalCurrentValue = investmentsForAccount.reduce(
    (sum, inv) => sum + inv.current_value,
    0,
  );
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalReturnPercentage =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: 'bold',
                  fontSize: 24,
                }}>
                {t.investments}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}>
                {investmentsForAccount.length}{' '}
                {investmentsForAccount.length === 1 ? 'investment' : 'investments'}
              </Text>
            </View>
          </View>

          {/* Portfolio Summary - Simplified */}
          <View style={{ marginBottom: 24, gap: 12 }}>
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                padding: 16,
              }}>
              <View className="flex-row items-center mb-2">
                <View
                  style={{
                    backgroundColor: '#dbeafe',
                    borderRadius: 20,
                    padding: 8,
                    marginRight: 8,
                  }}>
                  <DollarSign size={16} color="#3b82f6" />
                </View>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    fontWeight: '500',
                  }}>
                  {t.totalInvested}
                </Text>
              </View>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: 'bold',
                  fontSize: 28,
                }}>
                ${totalInvested.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                }}>
                <View className="flex-row items-center mb-2">
                  <View
                    style={{
                      backgroundColor:
                        totalCurrentValue >= totalInvested
                          ? '#dcfce7'
                          : '#fee2e2',
                      borderRadius: 20,
                      padding: 6,
                      marginRight: 6,
                    }}>
                    {totalCurrentValue >= totalInvested ? (
                      <TrendingUp size={14} color="#10b981" />
                    ) : (
                      <TrendingDown size={14} color="#ef4444" />
                    )}
                  </View>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 11,
                      fontWeight: '500',
                    }}>
                    {t.totalCurrentValue}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: 'bold',
                    fontSize: 18,
                  }}>
                  ${totalCurrentValue.toFixed(2)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                }}>
                <View className="flex-row items-center mb-2">
                  <View
                    style={{
                      backgroundColor:
                        totalProfitLoss >= 0 ? '#dcfce7' : '#fee2e2',
                      borderRadius: 20,
                      padding: 6,
                      marginRight: 6,
                    }}>
                    <BarChart3
                      size={14}
                      color={totalProfitLoss >= 0 ? '#10b981' : '#ef4444'}
                    />
                  </View>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 11,
                      fontWeight: '500',
                    }}>
                    {t.totalProfitLoss}
                  </Text>
                </View>
                <Text
                  style={{
                    fontWeight: 'bold',
                    fontSize: 18,
                    color: getProfitLossColor(totalProfitLoss),
                  }}>
                  ${totalProfitLoss.toFixed(2)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: getProfitLossColor(totalProfitLoss),
                    marginTop: 2,
                  }}>
                  {totalReturnPercentage.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          {/* My Investments - Simplified */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: theme.text,
                fontWeight: 'bold',
                fontSize: 18,
                marginBottom: 12,
              }}>
              {t.myInvestments}
            </Text>

            {investmentsForAccount.length === 0 ? (
              <View
                style={{
                  paddingVertical: 48,
                  alignItems: 'center',
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                }}>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 16,
                    fontWeight: '500',
                  }}>
                  {t.noInvestmentsYet}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 14,
                    marginTop: 8,
                  }}>
                  {t.addFirstInvestment}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {investmentsForAccount.map((investment) => {
                  const profitLossPercentage =
                    investment.invested_amount > 0
                      ? (investment.profit_loss / investment.invested_amount) *
                        100
                      : 0;
                  const isProfit = investment.profit_loss >= 0;

                  return (
                    <View
                      key={investment.id}
                      style={{
                        padding: 16,
                        backgroundColor: theme.cardBackground,
                        borderRadius: 16,
                      }}>
                      {/* Header */}
                      <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1">
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: 'bold',
                              fontSize: 18,
                            }}>
                            {investment.name}
                          </Text>
                          <View
                            className="flex-row items-center mt-1"
                            style={{ gap: 6 }}>
                            <View
                              style={{
                                backgroundColor: '#e0e7ff',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}>
                              <Text
                                style={{
                                  color: '#4f46e5',
                                  fontSize: 11,
                                  fontWeight: '600',
                                }}>
                                {getInvestmentTypeLabel(investment.type)}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: isProfit
                                  ? '#dcfce7'
                                  : '#fee2e2',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}>
                              <Text
                                style={{
                                  color: isProfit ? '#16a34a' : '#dc2626',
                                  fontSize: 11,
                                  fontWeight: '600',
                                }}>
                                {isProfit ? '+' : ''}
                                {profitLossPercentage.toFixed(2)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Amount Info */}
                      <View className="flex-row justify-between items-center mb-3">
                        <View>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 12,
                              marginBottom: 4,
                            }}>
                            Current Value
                          </Text>
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: 'bold',
                              fontSize: 24,
                            }}>
                            ${investment.current_value.toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 12,
                              marginBottom: 4,
                            }}>
                            Profit/Loss
                          </Text>
                          <View className="flex-row items-center">
                            {getProfitLossIcon(investment.profit_loss)}
                            <Text
                              style={{
                                fontWeight: 'bold',
                                fontSize: 20,
                                marginLeft: 4,
                                color: getProfitLossColor(
                                  investment.profit_loss,
                                ),
                              }}>
                              ${Math.abs(investment.profit_loss).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View className="mb-3">
                        <View
                          style={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: theme.border,
                            overflow: 'hidden',
                          }}>
                          <View
                            style={{
                              height: '100%',
                              width: `${Math.min(100, (investment.current_value / Math.max(investment.invested_amount, investment.current_value)) * 100)}%`,
                              backgroundColor: isProfit ? '#10b981' : '#ef4444',
                              borderRadius: 4,
                            }}
                          />
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text
                            style={{ color: theme.textMuted, fontSize: 11 }}>
                            Invested: ${investment.invested_amount.toFixed(2)}
                          </Text>
                          <Text
                            style={{ color: theme.textMuted, fontSize: 11 }}>
                            {investment.account?.name || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View
                        className="flex-row gap-2 pt-3 border-t"
                        style={{ borderColor: theme.border }}>
                        <TouchableOpacity
                          onPress={() => openEditModal(investment)}
                          className="flex-1 py-2 rounded-lg"
                          style={{ backgroundColor: '#e0e7ff' }}>
                          <Text
                            style={{
                              color: '#4f46e5',
                              fontWeight: '600',
                              fontSize: 13,
                              textAlign: 'center',
                            }}>
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteInvestment(investment.id)}
                          className="flex-1 py-2 rounded-lg"
                          style={{ backgroundColor: '#fee2e2' }}>
                          <Text
                            style={{
                              color: '#dc2626',
                              fontWeight: '600',
                              fontSize: 13,
                              textAlign: 'center',
                            }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Add/Edit Investment Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}>
            <View
              style={{
                width: '92%',
                backgroundColor: theme.cardBackground,
                borderRadius: 12,
                padding: 24,
                maxHeight: '90%',
              }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: 'bold',
                      fontSize: 18,
                    }}>
                    {currentInvestment ? t.editInvestment : t.addInvestment}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Investment type - Card opens bottom sheet */}
                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>{t.investmentType}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setTypeSheetOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: newType ? theme.primary : theme.border,
                      backgroundColor: theme.background,
                      minHeight: 50,
                    }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: newType ? theme.text : theme.textMuted }} numberOfLines={1}>
                      {newType ? getInvestmentTypeLabel(newType) : (t.selectInvestmentType || 'Select investment type')}
                    </Text>
                    <ChevronDown size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Type bottom sheet */}
                <Modal visible={typeSheetOpen} transparent animationType="slide" onRequestClose={() => setTypeSheetOpen(false)}>
                  <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setTypeSheetOpen(false)}>
                    <Pressable style={{ maxHeight: '75%', backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }} onPress={(e) => e.stopPropagation()}>
                      <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} /></View>
                      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>{t.selectInvestmentType || 'Select investment type'}</Text>
                        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                          {investmentTypes.map((type) => (
                            <TouchableOpacity
                              key={type.key}
                              activeOpacity={0.7}
                              onPress={() => { setNewType(type.key); setTypeSheetOpen(false); }}
                              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.background, marginBottom: 8, borderWidth: 1, borderColor: theme.border }}>
                              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, flex: 1 }}>{String(type.label ?? type.key)}</Text>
                              <ChevronDown size={18} color={theme.textMuted} style={{ transform: [{ rotate: '-90deg' }] }} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </Pressable>
                  </Pressable>
                </Modal>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.investmentName}
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 8,
                      padding: 12,
                      color: theme.text,
                      backgroundColor: theme.background,
                    }}
                    placeholder={t.enterInvestmentName}
                    placeholderTextColor={theme.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>

                {/* Account - Card opens bottom sheet */}
                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>{t.account}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setAccountSheetOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selectedAccount ? theme.primary : theme.border,
                      backgroundColor: theme.background,
                      minHeight: 50,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: selectedAccount ? `${theme.primary}18` : `${theme.border}40`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Wallet size={20} color={selectedAccount ? theme.primary : theme.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: selectedAccount ? theme.text : theme.textMuted }} numberOfLines={1}>
                          {selectedAccount?.name ?? (t.selectAccount || 'Select account')}
                        </Text>
                        {selectedAccount && <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{t.balance || 'Balance'}: ${selectedAccount.amount.toFixed(2)}</Text>}
                      </View>
                    </View>
                    <ChevronDown size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Account bottom sheet */}
                <Modal visible={accountSheetOpen} transparent animationType="slide" onRequestClose={() => setAccountSheetOpen(false)}>
                  <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setAccountSheetOpen(false)}>
                    <Pressable style={{ maxHeight: '75%', backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }} onPress={(e) => e.stopPropagation()}>
                      <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} /></View>
                      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>{t.selectAccount || 'Select account'}</Text>
                        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                          {accounts.length === 0 ? (
                            <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: 'center', paddingVertical: 24 }}>{t.noAccountsAvailable || 'No accounts available'}</Text>
                          ) : (
                            accounts.map((account) => (
                              <TouchableOpacity
                                key={account.id}
                                activeOpacity={0.7}
                                onPress={() => { setSelectedAccount(account); setAccountSheetOpen(false); }}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.background, marginBottom: 8, borderWidth: 1, borderColor: theme.border }}>
                                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${theme.primary}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                  <Wallet size={20} color={theme.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{account.name}</Text>
                                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{t.balance || 'Balance'}: ${account.amount.toFixed(2)}</Text>
                                </View>
                                <ChevronDown size={18} color={theme.textMuted} style={{ transform: [{ rotate: '-90deg' }] }} />
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    </Pressable>
                  </Pressable>
                </Modal>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.investedAmount}
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 8,
                      padding: 12,
                      color: theme.text,
                      backgroundColor: theme.background,
                    }}
                    placeholder={t.enterAmount}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={newInvestedAmount}
                    onChangeText={setNewInvestedAmount}
                  />
                </View>

                <View className="mb-6">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.currentValue}
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 8,
                      padding: 12,
                      color: theme.text,
                      backgroundColor: theme.background,
                    }}
                    placeholder={t.enterAmount}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={newCurrentValue}
                    onChangeText={setNewCurrentValue}
                  />
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={handleSaveInvestment}>
                  <Text style={{ color: theme.primaryText, fontWeight: '500' }}>
                    {currentInvestment ? t.updateInvestment : t.addInvestment}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Close area when FAB expanded */}
      {fabExpanded && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1}
          onPress={collapseFab}
        />
      )}

      {/* Expandable FAB - same pattern as Accounts */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 20,
          right: -10,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.primary,
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
          height: 50,
          width: fabAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 195],
          }),
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            height: '100%',
            width: '100%',
            paddingLeft: 12,
            paddingRight: 20,
          }}
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2} />
          {fabExpanded && (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: '600',
                marginLeft: 10,
                textTransform: 'uppercase',
              }}
            >
              {t.addInvestment}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

export default Investments;
