import dotenv from 'dotenv';
dotenv.config();

import { getShiprocketToken } from './src/services/shiprocketService.js';
import axios from 'axios';

async function testShiprocket() {
    console.log("Testing Shiprocket Auth...");
    try {
        const token = await getShiprocketToken();
        console.log("Auth Successful. Token:", token.substring(0, 20) + "...");

        console.log("Testing Order Creation...");
        const payload = {
            order_id: "TEST_ORDER_" + Date.now(),
            order_date: new Date().toISOString().split('T')[0],
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "work",
            billing_customer_name: "Test User",
            billing_last_name: "",
            billing_address: "123 Test Street, Test Area",
            billing_city: "New Delhi",
            billing_pincode: "110001",
            billing_state: "Delhi",
            billing_country: "India",
            billing_email: "test@example.com",
            billing_phone: "9876543210",
            shipping_is_billing: true,
            order_items: [
                {
                    name: "Kosmico Wellness Products",
                    sku: "KOSMICO-001",
                    units: 1,
                    selling_price: 500
                }
            ],
            payment_method: 'COD',
            sub_total: 500,
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

        console.log("Order Creation Successful:", response.data);
        if (response.data.message && response.data.message.includes('Wrong Pickup location')) {
            console.log("Available Pickup Locations:", JSON.stringify(response.data.data, null, 2));
        }
    } catch (error) {
        console.error("Test Failed!");
        if (error.response) {
            console.error("Shiprocket API Response:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testShiprocket();
