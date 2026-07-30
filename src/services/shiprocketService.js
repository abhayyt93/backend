import axios from 'axios';

let shiprocketToken = null;
let tokenExpiryTime = null;

// Helper to authenticate with Shiprocket and get JWT token
export const getShiprocketToken = async () => {
    try {
        // If token exists and is not expired (giving a 10 min buffer before actual expiry which is usually 10 days)
        if (shiprocketToken && tokenExpiryTime && new Date() < tokenExpiryTime) {
            return shiprocketToken;
        }

        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD
        });

        shiprocketToken = response.data.token;
        // Setting token expiry to 9 days from now (Shiprocket tokens are usually valid for 10 days)
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 9);
        tokenExpiryTime = expiry;

        return shiprocketToken;
    } catch (error) {
        console.error("Shiprocket Auth Error:", error.response?.data || error.message);
        throw new Error("Failed to authenticate with Shiprocket");
    }
};

// Helper to create order on Shiprocket
export const createShiprocketOrder = async (orderData, user, deliveryAddress, paymentMethod) => {
    try {
        const token = await getShiprocketToken();
        
        // Build payload according to Shiprocket API docs
        const payload = {
            order_id: orderData._id.toString(), // The MongoDB order ID
            order_date: new Date(orderData.createdAt || Date.now()).toISOString().split('T')[0],
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "work", // Changed from "Primary" to "work"
            billing_customer_name: deliveryAddress.fullName,
            billing_last_name: "",
            billing_address: deliveryAddress.streetAddress,
            billing_city: deliveryAddress.city,
            billing_pincode: deliveryAddress.pincode,
            billing_state: deliveryAddress.city, // Assuming city for now, or you can add state in schema
            billing_country: "India",
            billing_email: user.email,
            billing_phone: deliveryAddress.phoneNumber || user.phoneNumber,
            shipping_is_billing: true,
            order_items: [
                {
                    name: "Kosmico Wellness Products", // Dummy product name as items are not stored in Order DB
                    sku: "KOSMICO-001",
                    units: 1,
                    selling_price: orderData.amount
                }
            ],
            payment_method: paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            sub_total: orderData.amount,
            length: 10,
            breadth: 10,
            height: 10,
            weight: 0.5
        };

        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        // Shiprocket sometimes returns 200 OK with an error message instead of throwing 400
        if (!response.data.order_id && response.data.message) {
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (error) {
        console.error("Shiprocket Create Order Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Failed to create order on Shiprocket");
    }
};

// Helper to track Shiprocket order by shipment ID
export const trackShiprocketOrder = async (shipmentId) => {
    try {
        const token = await getShiprocketToken();
        const response = await axios.get(`https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Shiprocket Track Order Error:", error.response?.data || error.message);
        throw new Error("Failed to track order on Shiprocket");
    }
};

// Helper to cancel Shiprocket order
export const cancelShiprocketOrder = async (orderIds) => {
    try {
        const token = await getShiprocketToken();
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/cancel', {
            ids: orderIds
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Shiprocket Cancel Order Error:", error.response?.data || error.message);
        throw new Error("Failed to cancel order on Shiprocket");
    }
};

// Helper to create a return order on Shiprocket
export const createShiprocketReturnOrder = async (returnRequest, orderDetails, user) => {
    try {
        const token = await getShiprocketToken();
        
        // Ensure shippingAddress (delivery address of original order) is populated
        const pickupAddress = orderDetails.deliveryAddress;
        if (!pickupAddress) {
            throw new Error("Delivery address not found in original order.");
        }

        const payload = {
            order_id: `RET-${orderDetails._id}-${Date.now()}`,
            order_date: new Date().toISOString().split('T')[0],
            channel_id: "", 
            
            // Pickup details (Customer's address)
            pickup_customer_name: user.name,
            pickup_last_name: "",
            pickup_address: pickupAddress.streetAddress,
            pickup_address_2: pickupAddress.landmark || "",
            pickup_city: pickupAddress.city,
            pickup_state: pickupAddress.state || pickupAddress.city,
            pickup_country: "India",
            pickup_pincode: pickupAddress.pincode,
            pickup_email: user.email,
            pickup_phone: pickupAddress.phoneNumber || user.phoneNumber,

            // Shipping details (Your Warehouse details)
            shipping_customer_name: "Kosmico Wellness", // Replace with your actual name
            shipping_last_name: "",
            shipping_address: process.env.SHIPROCKET_PICKUP_LOCATION || "Warehouse Address",
            shipping_address_2: "",
            shipping_city: "Delhi", // Example
            shipping_state: "Delhi",
            shipping_country: "India",
            shipping_pincode: "110001", // Example
            shipping_email: "support@kosmico.com",
            shipping_phone: "9876543210",

            // Items being returned
            order_items: [
                {
                    name: "Kosmico Wellness Products - Return",
                    sku: "KOSMICO-RET-001",
                    units: 1, // Or base it on return request if multiple items
                    selling_price: orderDetails.amount,
                }
            ],

            payment_method: "Prepaid", 
            sub_total: orderDetails.amount,
            
            length: 10,
            breadth: 10,
            height: 10,
            weight: 0.5
        };

        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/return', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.order_id && response.data.message) {
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (error) {
        console.error("Shiprocket Create Return Order Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Failed to create return order on Shiprocket");
    }
};
