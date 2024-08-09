import {OrderInfo} from "@telegraf/types";

const WOOCOMMERCE_URL = process.env.WOOCOMMERCE_URL!!
const CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY!!
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET!!

/**
 * Makes a PUT request to the WooCommerce API.
 *
 * @param {string} api - The WooCommerce API endpoint.
 * @param {any} body - The request body.
 * @param {URLSearchParams} [query] - Optional query parameters.
 * @return {Promise<Response>} The response from the API.
 */
function put(api: string, body: any, query?: URLSearchParams) {
    return call("PUT", api, query, body);
}

/**
 * Sends a POST request to the specified API with the provided body and optional query parameters.
 *
 * @param {string} api - The API endpoint to send the request to.
 * @param {any} body - The data to be sent in the request body.
 * @param {URLSearchParams} [query] - Optional query parameters to be included in the request.
 * @return {Promise<any>} A Promise that resolves to the response data.
 */
function post(api: string, body: any, query?: URLSearchParams) {
    return call("POST", api, query, body);
}

/**
 * Makes a GET request to the WooCommerce API.
 *
 * @param {string} api - The WooCommerce API endpoint.
 * @param {URLSearchParams} [query] - Optional query parameters.
 * @return {Promise<any>} The response from the API.
 */
function get(api: string, query?: URLSearchParams) {
    return call("GET", api, query, undefined)
}

/**
 * Makes a request to the WooCommerce API using the specified method.
 *
 * @param {string} method - The HTTP method to use (e.g. GET, POST, PUT, etc.).
 * @param {string} api - The WooCommerce API endpoint.
 * @param {URLSearchParams} [query] - Optional query parameters.
 * @param {any} [body] - Optional request body.
 * @return {Promise<Response>} The response from the API.
 */
function call(method: string, api: string, query?: URLSearchParams, body?: any) {
    const headers = {
        "Content-Type": "application/json"
    };

    let url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/${api}`.replace("//", "/");
    if (!query)
        query = new URLSearchParams()
    query.set("consumer_secret", CONSUMER_SECRET);
    query.set("consumer_key", CONSUMER_KEY);
    url = url + "?" + query.toString();
    if (body)
        body = JSON.stringify(body)

    let init = {body, method, headers};

    console.log(`Proxy woo: ${url} | ${JSON.stringify(init)}`);

    return fetch(url, init);
}

/**
 * Creates a new order with the specified line items and customer note.
 *
 * @param {any[]} line_items - The line items to include in the order.
 * @param {string} customer_note - The note from the customer for the order.
 * @return {Promise<any>} A Promise that resolves to the JSON response of the created order.
 */
async function createOrder(line_items: any[], customer_note: string) {
    const body = {
        "set_paid": false,
        line_items,
        customer_note,
    }
    const res = await post("orders", body)
    return await res.json()
}

/**
 * Updates an existing order with the specified information.
 *
 * @param {number} orderId - The ID of the order to update.
 * @param {any} update - The new information to update the order with.
 * @return {any} The result of the update operation.
 */
function updateOrder(orderId: number, update: any) {
    return put(`orders/${orderId}`, update)
}

function updateOrderInfo(orderId: number, orderInfo: OrderInfo) {
    const update = {
        shipping: {
            first_name: orderInfo.name,
            last_name: orderInfo.name,
            address_1: orderInfo.shipping_address?.street_line1,
            address_2: orderInfo.shipping_address?.street_line2,
            city: orderInfo.shipping_address?.city,
            state: orderInfo.shipping_address?.state,
            postcode: orderInfo.shipping_address?.post_code,
            country: orderInfo.shipping_address?.country_code,
        },
        billing: {
            first_name: orderInfo.name,
            last_name: orderInfo.name,
            email: orderInfo.email,
            phone: orderInfo.phone_number,
            address_1: orderInfo.shipping_address?.street_line1,
            address_2: orderInfo.shipping_address?.street_line2,
            city: orderInfo.shipping_address?.city,
            state: orderInfo.shipping_address?.state,
            postcode: orderInfo.shipping_address?.post_code,
            country: orderInfo.shipping_address?.country_code,
        }
    }
    return updateOrder(orderId, update)
}

function setOrderPaid(orderId: number) {
    const update = {
        set_paid: true,
    }
    return updateOrder(orderId, update)
}


async function getShippingOptions(zoneId: number) {
    const res = await woo.get(`shipping/zones/${zoneId}/methods`)
    const methods: any[] = await res.json()
    return methods.filter((method) => method.enabled)
        .map((method) => {
            return {
                id: method.method_id,
                title: method.method_title,
                prices: [{label: "Free", amount: 0}], //TODO: set price from shipping method
            }
        });
}

/**
 * Creates a new user based on the provided order information.
 *
 * @param {OrderInfo} orderInfo - The order information used to create the user.
 * @return {Promise<any>} The created user data.
 */
async function createUser(orderInfo: OrderInfo) {
    const body = {
        email: orderInfo.email,
        first_name: orderInfo.name,
        last_name: orderInfo.name,
        username: orderInfo.name,
        shipping: {
            first_name: orderInfo.name,
            last_name: orderInfo.name,
            address_1: orderInfo.shipping_address?.street_line1,
            address_2: orderInfo.shipping_address?.street_line2,
            city: orderInfo.shipping_address?.city,
            state: orderInfo.shipping_address?.state,
            postcode: orderInfo.shipping_address?.post_code,
            country: orderInfo.shipping_address?.country_code,
        },
        billing: {
            first_name: orderInfo.name,
            last_name: orderInfo.name,
            email: orderInfo.email,
            phone: orderInfo.phone_number,
            address_1: orderInfo.shipping_address?.street_line1,
            address_2: orderInfo.shipping_address?.street_line2,
            city: orderInfo.shipping_address?.city,
            state: orderInfo.shipping_address?.state,
            postcode: orderInfo.shipping_address?.post_code,
            country: orderInfo.shipping_address?.country_code,
        },
    };
    
    const res = await post("customers", body)
    return await res.json()
}

const woo = {
    get, createOrder, createUser, updateOrderInfo, setOrderPaid, getShippingOptions
}

export default woo