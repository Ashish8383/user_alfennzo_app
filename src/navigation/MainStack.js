import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OutletMenuScreen   from '../screens/outlet/OutletMenuScreen';
import MenuItemDetail     from '../screens/outlet/MenuItemDetail';
import CartModal          from '../screens/cart/CartModal';
import OrderConfirmScreen from '../screens/cart/OrderConfirmScreen';
import HomeScreen from '../screens/home/HomeScreen';
import QRScanScreen from '../screens/scan/QRScanScreen'; 
import MenuSearchScreen from '../screens/outlet/MenuSearchScreen';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="QRScan" component={QRScanScreen} options={{ 
    headerShown: false,  
    animation: 'slide_from_right', 
  }} /> 
      <Stack.Screen name="OutletMenu" component={OutletMenuScreen} />
      <Stack.Screen name="MenuItemDetail" component={MenuItemDetail} />
      <Stack.Screen
        name="Cart"
        component={CartModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="MenuSearchScreen" component={MenuSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderConfirm" component={OrderConfirmScreen} />
    </Stack.Navigator>
  );
}