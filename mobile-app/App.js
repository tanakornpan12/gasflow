import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createPayment, getBankAccounts, getOrders, updateOrderStatus } from "./src/api";
import { formatThaiDate } from "./src/date";
import { drivers, fallbackOrders } from "./src/mockData";

const colors = {
  bg: "#f5f7fb",
  surface: "#ffffff",
  surface2: "#f8fafc",
  text: "#1f2937",
  muted: "#6b7280",
  line: "#cbd5e1",
  lineSoft: "#e5eaf2",
  green: "#0fb43f",
  greenSoft: "#e9f9ee",
  blue: "#2f80ed",
  blueSoft: "#eaf3ff",
  amber: "#ff9d17",
  amberSoft: "#fff4df",
  red: "#ff4d5e",
  redSoft: "#fff0f2",
};

const tabs = [
  { key: "today", label: "งานวันนี้", icon: "clipboard-list-outline" },
  { key: "assign", label: "จัดคิว", icon: "account-switch-outline" },
  { key: "close", label: "ปิดรอบ", icon: "cash-register" },
  { key: "profile", label: "โปรไฟล์", icon: "account-circle-outline" },
];

function normalizeOrder(order, index) {
  return {
    ...order,
    status: mapStatus(order.status),
    phone: order.phone || order.customer_phone || "081-234-5678",
    payment_method: order.payment_method || methodFromPaymentStatus(order.payment_status),
    assigned_driver_id: order.assigned_driver_id ?? ((index % 3) + 1),
    empty_returned: order.empty_returned || 0,
  };
}

function mapStatus(status = "") {
  if (status.includes("กำลัง")) return "กำลังส่ง";
  if (status.includes("สำเร็จ") || status.includes("ส่งแล้ว")) return "ส่งแล้ว";
  if (status.includes("ปัญหา") || status.includes("ไม่สำเร็จ")) return "มีปัญหา";
  return "รอส่ง";
}

function methodFromPaymentStatus(status = "") {
  if (status.includes("เครดิต")) return "เครดิต";
  if (status.includes("โอน")) return "โอน";
  return "เงินสด";
}

function statusTone(status) {
  if (status === "ส่งแล้ว") return { color: colors.green, bg: colors.greenSoft, icon: "check-circle-outline" };
  if (status === "กำลังส่ง") return { color: colors.blue, bg: colors.blueSoft, icon: "truck-delivery-outline" };
  if (status === "มีปัญหา") return { color: colors.red, bg: colors.redSoft, icon: "alert-circle-outline" };
  return { color: colors.amber, bg: colors.amberSoft, icon: "clock-outline" };
}

function money(value) {
  return Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export default function App() {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDriverId, setSelectedDriverId] = useState(1);
  const [orders, setOrders] = useState(fallbackOrders.map(normalizeOrder));
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const [apiOrders, accounts] = await Promise.all([getOrders(), getBankAccounts()]);
      setOrders(apiOrders.map(normalizeOrder));
      setBankAccounts(accounts);
      setUsingFallback(false);
    } catch (error) {
      setOrders(fallbackOrders.map(normalizeOrder));
      setUsingFallback(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesDriver = selectedDriverId === 0 || order.assigned_driver_id === selectedDriverId;
      const matchesQuery =
        !keyword ||
        String(order.order_no || "").toLowerCase().includes(keyword) ||
        String(order.customer_name || "").toLowerCase().includes(keyword) ||
        String(order.delivery_address || "").toLowerCase().includes(keyword);
      return matchesDriver && matchesQuery;
    });
  }, [orders, query, selectedDriverId]);

  async function changeStatus(order, status) {
    const previousOrders = orders;
    const nextOrders = orders.map((item) => (item.id === order.id ? { ...item, status } : item));
    setOrders(nextOrders);
    setSelectedOrder((current) => (current?.id === order.id ? { ...current, status } : current));

    try {
      if (!usingFallback) await updateOrderStatus(order.id, status);
    } catch (error) {
      setOrders(previousOrders);
      Alert.alert("บันทึกไม่สำเร็จ", "ลองเชื่อมต่อ API แล้วทำรายการอีกครั้ง");
    }
  }

  async function savePayment(order, method) {
    try {
      if (!usingFallback) {
        await createPayment({
          order_id: order.id,
          customer_id: order.customer_id,
          method,
          amount: Number(order.total_amount || 0),
          note: `รับเงินจากมือถือ: ${order.order_no}`,
        });
      }
      await changeStatus(order, "ส่งแล้ว");
      Alert.alert("บันทึกแล้ว", `รับเงิน ${method} ${money(order.total_amount)} บาท`);
    } catch (error) {
      Alert.alert("บันทึกรับเงินไม่สำเร็จ", "ตรวจสอบ API แล้วลองใหม่อีกครั้ง");
    }
  }

  function assignDriver(order, driverId) {
    setOrders((items) => items.map((item) => (item.id === order.id ? { ...item, assigned_driver_id: driverId } : item)));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.app}>
        <AppHeader usingFallback={usingFallback} />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.green} />
            <Text style={styles.mutedText}>กำลังโหลดข้อมูลงานส่ง</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "today" && (
              <TodayScreen
                orders={filteredOrders}
                allOrders={orders}
                selectedDriverId={selectedDriverId}
                setSelectedDriverId={setSelectedDriverId}
                query={query}
                setQuery={setQuery}
                onOpenOrder={setSelectedOrder}
              />
            )}
            {activeTab === "assign" && <AssignScreen orders={orders} onAssign={assignDriver} onOpenOrder={setSelectedOrder} />}
            {activeTab === "close" && <CloseRoundScreen orders={orders.filter((item) => item.assigned_driver_id === 1)} />}
            {activeTab === "profile" && <ProfileScreen />}
          </ScrollView>
        )}
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <OrderDetailModal
          order={selectedOrder}
          bankAccounts={bankAccounts}
          onClose={() => setSelectedOrder(null)}
          onChangeStatus={changeStatus}
          onSavePayment={savePayment}
        />
      </View>
    </SafeAreaView>
  );
}

function AppHeader({ usingFallback }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandIcon}>
        <MaterialCommunityIcons name="gas-cylinder" size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.brandName}>GasFlow</Text>
        <Text style={styles.headerSub}>แอปงานส่ง · {formatThaiDate()}</Text>
      </View>
      {usingFallback && <Text style={styles.offlineBadge}>ตัวอย่าง</Text>}
    </View>
  );
}

function TodayScreen({ orders, allOrders, selectedDriverId, setSelectedDriverId, query, setQuery, onOpenOrder }) {
  return (
    <View>
      <View style={styles.driverHeader}>
        <View>
          <Text style={styles.screenTitle}>งานวันนี้</Text>
          <Text style={styles.screenSub}>สมชาย · เห็นงานตามคนส่งที่เลือก</Text>
        </View>
        <Text style={styles.datePill}>{formatThaiDate()}</Text>
      </View>

      <KpiGrid orders={allOrders} />
      <DriverSelector selectedDriverId={selectedDriverId} setSelectedDriverId={setSelectedDriverId} orders={allOrders} />
      <SearchBox value={query} onChangeText={setQuery} placeholder="ค้นหาลูกค้า/เลขออเดอร์" />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>รายการงานส่ง</Text>
        <Text style={styles.sectionCount}>{orders.length} งาน</Text>
      </View>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onPress={() => onOpenOrder(order)} />
      ))}
      {!orders.length && <EmptyState text="ยังไม่มีงานในเงื่อนไขนี้" />}
    </View>
  );
}

function KpiGrid({ orders }) {
  const items = [
    { label: "งานทั้งหมด", value: orders.length, color: colors.green, bg: colors.greenSoft, icon: "clipboard-list-outline" },
    { label: "รอส่ง", value: orders.filter((o) => o.status === "รอส่ง").length, color: colors.amber, bg: colors.amberSoft, icon: "clock-outline" },
    { label: "กำลังส่ง", value: orders.filter((o) => o.status === "กำลังส่ง").length, color: colors.blue, bg: colors.blueSoft, icon: "truck-delivery-outline" },
    { label: "ส่งแล้ว", value: orders.filter((o) => o.status === "ส่งแล้ว").length, color: colors.green, bg: colors.greenSoft, icon: "check-circle-outline" },
  ];
  return (
    <View style={styles.kpiGrid}>
      {items.map((item) => (
        <View key={item.label} style={[styles.kpiCard, { borderColor: item.color, backgroundColor: item.bg }]}>
          <View style={[styles.kpiIcon, { backgroundColor: item.color }]}>
            <MaterialCommunityIcons name={item.icon} size={16} color="#fff" />
          </View>
          <Text style={styles.kpiLabel}>{item.label}</Text>
          <Text style={[styles.kpiValue, { color: item.color }]}>{item.value}</Text>
          <Text style={styles.kpiUnit}>ออเดอร์</Text>
        </View>
      ))}
    </View>
  );
}

function DriverSelector({ selectedDriverId, setSelectedDriverId, orders }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.driverScroll}>
      {drivers.map((driver) => {
        const count = driver.id === 0 ? orders.length : orders.filter((order) => order.assigned_driver_id === driver.id).length;
        const active = selectedDriverId === driver.id;
        const borderColor = driver.id === null ? colors.amber : active ? colors.green : colors.line;
        return (
          <TouchableOpacity key={String(driver.id)} style={[styles.driverCard, active && styles.driverCardActive, { borderColor }]} onPress={() => setSelectedDriverId(driver.id)}>
            <View style={[styles.avatar, { backgroundColor: driver.id === null ? colors.amberSoft : colors.blueSoft }]}>
              <MaterialCommunityIcons name={driver.id === null ? "account-question-outline" : "account"} size={18} color={driver.id === null ? colors.amber : colors.blue} />
            </View>
            <Text style={styles.driverName}>{driver.shortName}</Text>
            <Text style={styles.driverCount}>{count}</Text>
            <Text style={styles.driverUnit}>งาน</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SearchBox({ value, onChangeText, placeholder }) {
  return (
    <View style={styles.searchBox}>
      <MaterialCommunityIcons name="magnify" size={18} color={colors.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.searchInput} />
      <MaterialCommunityIcons name="tune-variant" size={18} color={colors.green} />
    </View>
  );
}

function OrderCard({ order, onPress }) {
  const tone = statusTone(order.status);
  return (
    <TouchableOpacity style={[styles.orderCard, { borderLeftColor: tone.color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.orderTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNo}>{order.order_no}</Text>
          <Text style={styles.customerName}>{order.customer_name || "ไม่ระบุลูกค้า"}</Text>
        </View>
        <Text style={[styles.statusBadge, { color: tone.color, backgroundColor: tone.bg, borderColor: tone.color }]}>{order.status}</Text>
      </View>
      <View style={styles.orderLine}>
        <MaterialCommunityIcons name="map-marker-outline" size={15} color={colors.muted} />
        <Text style={styles.orderAddress} numberOfLines={1}>{order.delivery_address || "-"}</Text>
      </View>
      <View style={styles.orderItems}>
        {(order.items || []).slice(0, 2).map((item, index) => (
          <Text key={`${order.id}-${index}`} style={styles.itemText}>
            {item.product_name || "สินค้า"} x{item.quantity}
          </Text>
        ))}
      </View>
      <View style={styles.orderBottom}>
        <View style={styles.orderActions}>
          <SmallIconButton icon="phone-outline" color={colors.green} onPress={() => callCustomer(order.phone)} />
          <SmallIconButton icon="map-outline" color={colors.blue} onPress={() => openMap(order)} />
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>{money(order.total_amount)} บาท</Text>
          <Text style={styles.paymentText}>{order.payment_method}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SmallIconButton({ icon, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.smallIconButton, { borderColor: color }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
    </TouchableOpacity>
  );
}

function AssignScreen({ orders, onAssign, onOpenOrder }) {
  const [search, setSearch] = useState("");
  const visibleOrders = orders.filter((order) => {
    const value = `${order.order_no} ${order.customer_name} ${order.delivery_address}`.toLowerCase();
    return value.includes(search.trim().toLowerCase());
  });
  return (
    <View>
      <View style={styles.driverHeader}>
        <View>
          <Text style={styles.screenTitle}>จัดคิวคนส่ง</Text>
          <Text style={styles.screenSub}>รองรับคนส่งหลายคนตั้งแต่เฟสแรก</Text>
        </View>
      </View>
      <DriverSummary orders={orders} />
      <SearchBox value={search} onChangeText={setSearch} placeholder="ค้นหาออเดอร์/ลูกค้า" />
      {visibleOrders.map((order) => (
        <View key={order.id} style={styles.assignCard}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onOpenOrder(order)}>
            <Text style={styles.orderNo}>{order.order_no}</Text>
            <Text style={styles.customerName}>{order.customer_name}</Text>
            <Text style={styles.orderAddress} numberOfLines={1}>{order.delivery_address}</Text>
          </TouchableOpacity>
          <View style={styles.assignSide}>
            <Text style={styles.amountText}>{money(order.total_amount)}</Text>
            <DriverCycleButton order={order} onAssign={onAssign} />
          </View>
        </View>
      ))}
    </View>
  );
}

function DriverSummary({ orders }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.driverScroll}>
      {drivers.map((driver) => {
        const count = driver.id === 0 ? orders.length : orders.filter((order) => order.assigned_driver_id === driver.id).length;
        const color = driver.id === null ? colors.amber : driver.id === 2 ? colors.blue : colors.green;
        return (
          <View key={String(driver.id)} style={[styles.summaryDriverCard, { borderColor: color }]}>
            <Text style={styles.driverName}>{driver.shortName}</Text>
            <Text style={[styles.driverCount, { color }]}>{count}</Text>
            <Text style={styles.driverUnit}>งาน</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function DriverCycleButton({ order, onAssign }) {
  const driverOptions = drivers.filter((driver) => driver.id !== 0);
  const currentIndex = driverOptions.findIndex((driver) => driver.id === order.assigned_driver_id);
  const currentDriver = driverOptions[currentIndex] || driverOptions[driverOptions.length - 1];
  function nextDriver() {
    const next = driverOptions[(currentIndex + 1 + driverOptions.length) % driverOptions.length];
    onAssign(order, next.id);
  }
  return (
    <TouchableOpacity style={[styles.assignButton, currentDriver.id === null && styles.assignButtonPending]} onPress={nextDriver}>
      <Text style={styles.assignButtonText}>{currentDriver.id === null ? "มอบหมาย" : currentDriver.name}</Text>
      <MaterialCommunityIcons name="chevron-down" size={16} color={currentDriver.id === null ? colors.amber : colors.green} />
    </TouchableOpacity>
  );
}

function CloseRoundScreen({ orders }) {
  const delivered = orders.filter((order) => order.status === "ส่งแล้ว");
  const pending = orders.filter((order) => order.status !== "ส่งแล้ว");
  const cashTotal = delivered.filter((order) => order.payment_method === "เงินสด").reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const transferTotal = delivered.filter((order) => order.payment_method === "โอน").reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const creditTotal = delivered.filter((order) => order.payment_method === "เครดิต").reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  return (
    <View>
      <View style={styles.driverHeader}>
        <View>
          <Text style={styles.screenTitle}>ปิดรอบคนส่ง</Text>
          <Text style={styles.screenSub}>สมชาย · {formatThaiDate()}</Text>
        </View>
      </View>
      <View style={styles.closeGrid}>
        <CloseCard label="ส่งสำเร็จ" value={delivered.length} color={colors.green} />
        <CloseCard label="ค้างส่ง" value={pending.length} color={colors.amber} />
        <CloseCard label="เงินสด" value={money(cashTotal)} color={colors.green} />
        <CloseCard label="โอน" value={money(transferTotal)} color={colors.blue} />
        <CloseCard label="เครดิต" value={money(creditTotal)} color={colors.amber} />
        <CloseCard label="ถังเปล่า" value={delivered.length} color={colors.green} />
      </View>
      <View style={styles.reconcileCard}>
        <Text style={styles.sectionTitle}>ตรวจยอดส่งร้าน</Text>
        <Text style={styles.fieldLabel}>ยอดเงินสดที่ส่งร้าน</Text>
        <TextInput style={styles.amountInput} value={String(cashTotal)} keyboardType="numeric" />
        <Text style={styles.fieldLabel}>หมายเหตุปิดรอบ</Text>
        <TextInput style={[styles.amountInput, styles.noteInput]} placeholder="เช่น งานค้าง 1 ราย ลูกค้าไม่อยู่" placeholderTextColor={colors.muted} />
      </View>
      <TouchableOpacity style={styles.primaryWide}>
        <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
        <Text style={styles.primaryWideText}>ปิดรอบส่งยอด</Text>
      </TouchableOpacity>
    </View>
  );
}

function CloseCard({ label, value, color }) {
  return (
    <View style={[styles.closeCard, { borderColor: color }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <MaterialCommunityIcons name="account" size={30} color={colors.green} />
        </View>
        <Text style={styles.screenTitle}>สมชาย</Text>
        <Text style={styles.screenSub}>บทบาท: คนส่ง</Text>
      </View>
      <View style={styles.reconcileCard}>
        <Text style={styles.sectionTitle}>สิทธิ์ที่รองรับ</Text>
        <Text style={styles.featureLine}>เจ้าของร้าน · Dashboard มือถือในเฟสถัดไป</Text>
        <Text style={styles.featureLine}>แคชเชียร์ · จัดคิวส่งและรับเงิน</Text>
        <Text style={styles.featureLine}>คนส่ง · งานวันนี้และปิดรอบ</Text>
      </View>
    </View>
  );
}

function OrderDetailModal({ order, bankAccounts, onClose, onChangeStatus, onSavePayment }) {
  const [emptyReturned, setEmptyReturned] = useState(0);
  const [method, setMethod] = useState("เงินสด");

  useEffect(() => {
    setEmptyReturned(order?.empty_returned || 0);
    setMethod(order?.payment_method || "เงินสด");
  }, [order]);

  if (!order) return null;

  const tone = statusTone(order.status);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderNo}>{order.order_no}</Text>
              <Text style={styles.screenSub}>รายละเอียดงานส่ง</Text>
            </View>
            <Text style={[styles.statusBadge, { color: tone.color, backgroundColor: tone.bg, borderColor: tone.color }]}>{order.status}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.customerCard}>
              <View style={styles.customerIcon}>
                <MaterialCommunityIcons name="account" size={22} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{order.customer_name}</Text>
                <Text style={styles.orderAddress}>{order.phone}</Text>
                <Text style={styles.orderAddress}>{order.delivery_address}</Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionButton, { borderColor: colors.green }]} onPress={() => callCustomer(order.phone)}>
                <MaterialCommunityIcons name="phone-outline" size={18} color={colors.green} />
                <Text style={[styles.actionText, { color: colors.green }]}>โทร</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { borderColor: colors.blue }]} onPress={() => openMap(order)}>
                <MaterialCommunityIcons name="map-outline" size={18} color={colors.blue} />
                <Text style={[styles.actionText, { color: colors.blue }]}>แผนที่</Text>
              </TouchableOpacity>
            </View>
            <Panel title="รายการสินค้า" borderColor={colors.green}>
              {(order.items || []).map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>{money(Number(item.quantity || 0) * Number(item.unit_price || 0))}</Text>
                </View>
              ))}
            </Panel>
            <Panel title="รับถังเปล่า" borderColor={colors.amber} tinted>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepButton} onPress={() => setEmptyReturned(Math.max(0, emptyReturned - 1))}>
                  <MaterialCommunityIcons name="minus" size={18} color={colors.amber} />
                </TouchableOpacity>
                <Text style={styles.stepText}>รับถังเปล่า {emptyReturned} ใบ</Text>
                <TouchableOpacity style={styles.stepButton} onPress={() => setEmptyReturned(emptyReturned + 1)}>
                  <MaterialCommunityIcons name="plus" size={18} color={colors.amber} />
                </TouchableOpacity>
              </View>
            </Panel>
            <Panel title="รับเงิน" borderColor={colors.blue}>
              <View style={styles.segment}>
                {["เงินสด", "โอน", "เครดิต"].map((item) => (
                  <TouchableOpacity key={item} style={[styles.segmentItem, method === item && styles.segmentItemActive]} onPress={() => setMethod(item)}>
                    <Text style={[styles.segmentText, method === item && styles.segmentTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.amountPreview}>
                <Text style={styles.fieldLabel}>ยอดรับเงิน</Text>
                <Text style={styles.modalAmount}>{money(order.total_amount)} บาท</Text>
              </View>
              {method === "โอน" && (
                <Text style={styles.bankHint}>
                  บัญชีร้าน: {bankAccounts[0]?.bank_name || "เลือกบัญชีร้าน"} {bankAccounts[0]?.account_number || ""}
                </Text>
              )}
              <TouchableOpacity style={styles.proofBox}>
                <MaterialCommunityIcons name="camera-outline" size={22} color={colors.blue} />
                <Text style={styles.proofText}>ถ่ายรูปหลักฐาน</Text>
              </TouchableOpacity>
            </Panel>
          </ScrollView>
          <View style={styles.stickyActions}>
            <TouchableOpacity style={styles.problemButton} onPress={() => onChangeStatus(order, "มีปัญหา")}>
              <Text style={styles.problemText}>มีปัญหา</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => onSavePayment(order, method)}>
              <Text style={styles.primaryText}>ส่งสำเร็จ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Panel({ title, borderColor, tinted, children }) {
  return (
    <View style={[styles.panel, { borderColor, backgroundColor: tinted ? colors.amberSoft : colors.surface }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TabBar({ activeTab, setActiveTab }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity key={tab.key} style={[styles.tabItem, active && styles.tabItemActive]} onPress={() => setActiveTab(tab.key)}>
            <MaterialCommunityIcons name={tab.icon} size={20} color={active ? colors.green : colors.muted} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EmptyState({ text }) {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="clipboard-text-search-outline" size={30} color={colors.muted} />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}

function callCustomer(phone) {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

function openMap(order) {
  const lat = order.customer_latitude;
  const lng = order.customer_longitude;
  const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(order.delivery_address || "");
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  app: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
    borderWidth: 1,
    borderColor: "#0a8f31",
  },
  brandName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  headerSub: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  offlineBadge: {
    color: colors.amber,
    backgroundColor: colors.amberSoft,
    borderColor: colors.amber,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900",
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  screenSub: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  datePill: {
    color: colors.green,
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontWeight: "900",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    minHeight: 104,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 8,
  },
  kpiIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  kpiLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
  },
  kpiValue: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
  },
  kpiUnit: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  driverScroll: {
    marginTop: 10,
    marginBottom: 10,
  },
  driverCard: {
    width: 86,
    minHeight: 92,
    marginRight: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  driverCardActive: {
    backgroundColor: colors.greenSoft,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  driverName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  driverCount: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  driverUnit: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  searchBox: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  sectionCount: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  orderCard: {
    marginBottom: 10,
    padding: 10,
    borderLeftWidth: 5,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  orderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  orderNo: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  customerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  statusBadge: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
  },
  orderLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  orderAddress: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  orderItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  itemText: {
    color: colors.text,
    backgroundColor: colors.surface2,
    borderColor: colors.lineSoft,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  orderBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallIconButton: {
    width: 36,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  amountBox: {
    alignItems: "flex-end",
  },
  amountText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  paymentText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  summaryDriverCard: {
    width: 92,
    minHeight: 78,
    marginRight: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  assignCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  assignSide: {
    alignItems: "flex-end",
    gap: 6,
  },
  assignButton: {
    minWidth: 98,
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 8,
  },
  assignButtonPending: {
    borderColor: colors.amber,
    backgroundColor: colors.amberSoft,
  },
  assignButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  closeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  closeCard: {
    width: "31.8%",
    minHeight: 82,
    borderWidth: 1.5,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 9,
    justifyContent: "center",
  },
  reconcileCard: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 10,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
  },
  amountInput: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "900",
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  primaryWide: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.green,
    marginBottom: 96,
  },
  primaryWideText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  profileCard: {
    alignItems: "center",
    padding: 18,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.green,
    marginBottom: 8,
  },
  featureLine: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },
  modalSheet: {
    maxHeight: "92%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  customerCard: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.surface,
    padding: 10,
    marginBottom: 8,
  },
  customerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.green,
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  panel: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    paddingVertical: 8,
  },
  itemName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  itemQty: {
    width: 42,
    color: colors.muted,
    textAlign: "center",
    fontWeight: "900",
  },
  itemPrice: {
    width: 76,
    color: colors.text,
    textAlign: "right",
    fontWeight: "900",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stepButton: {
    width: 42,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.amber,
    backgroundColor: colors.surface,
  },
  stepText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  segment: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    padding: 4,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  segmentItem: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  segmentItemActive: {
    backgroundColor: colors.blue,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#fff",
  },
  amountPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalAmount: {
    color: colors.green,
    fontSize: 20,
    fontWeight: "900",
  },
  bankHint: {
    color: colors.blue,
    backgroundColor: colors.blueSoft,
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
  },
  proofBox: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
    marginTop: 10,
  },
  proofText: {
    color: colors.blue,
    fontWeight: "900",
  },
  stickyActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.bg,
  },
  problemButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: colors.redSoft,
  },
  problemText: {
    color: colors.red,
    fontWeight: "900",
  },
  primaryButton: {
    flex: 2,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.green,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  tabBar: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: "row",
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    padding: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.green,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
  },
  tabLabelActive: {
    color: colors.green,
  },
  emptyState: {
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: 90,
  },
  mutedText: {
    color: colors.muted,
    fontWeight: "700",
  },
});
