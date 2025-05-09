import { gql } from '@apollo/client';
import { CheckoutPageFragment } from './checkoutPageFragments.gql';
import { ItemsReviewFragment } from './ItemsReview/itemsReviewFragments.gql';
import { OrderConfirmationPageFragment } from './OrderConfirmationPage/orderConfirmationPageFragments.gql';
import { VALIDATE_CUSTOMER_CART_ADDRESS } from './ShippingInformation/shippingInformation.gql';
import { ShippingInformationFragment } from './ShippingInformation/shippingInformationFragments.gql';

export const CREATE_CART = gql`
    # This mutation will return a masked cart id. If a bearer token is provided for
    # a logged in user it will return the cart id for that user.
    mutation createCart {
        cartId: createEmptyCart
    }
`;

export const PLACE_ORDER = gql`
    mutation placeOrder($cartId: String!) {
        placeOrder(input: { cart_id: $cartId }) {
            orderV2 {
                id
                number
            }
        }
    }
`;

export const PLACE_ORDER_CARD_KNOX = gql`
    mutation placeOrder(
        $Token: String!
        $Exp: String!
        $cvv: String!
        $cartId: String!
        $cardType: String!
        $saveCard: Boolean
    ) {
        createCardknoxOrder(
            input: {
                QuoteId: $cartId
                xCardNum: $Token
                xExp: $Exp
                xCVV: $cvv
                TokenType: "cc"
                CardType: $cardType
                saveCard: $saveCard
            }
        ) {
            error
            OrderId
        }
    }
`;

export const PLACE_ORDER_CARD_KNOX_STATIC = gql`
    mutation placeOrder($Token: String!, $cartId: String!) {
        createCardknoxStaticOrder(input: { Token: $Token, QuoteId: $cartId }) {
            error
            OrderId
        }
    }
`;

// A query to fetch order details _right_ before we submit, so that we can pass
// data to the order confirmation page.
export const GET_ORDER_DETAILS = gql`
    query getOrderDetails($cartId: String!) {
        cart(cart_id: $cartId) {
            id
            ...OrderConfirmationPageFragment
        }
    }
    ${OrderConfirmationPageFragment}
`;

export const GET_CHECKOUT_DETAILS = gql`
    query getCheckoutDetails($cartId: String!) {
        cart(cart_id: $cartId) {
            id
            ...CheckoutPageFragment
            ...ShippingInformationFragment
            ...ItemsReviewFragment
        }
    }
    ${CheckoutPageFragment}
    ${ShippingInformationFragment}
    ${ItemsReviewFragment}
`;

export const GET_CUSTOMER = gql`
    query GetCustomerForCheckout {
        # eslint-disable-next-line @graphql-eslint/require-id-when-available
        customer {
            default_shipping
            default_billing
            firstname
            customattributes {
                paymentterms
            }
        }
    }
`;

export default {
    createCartMutation: CREATE_CART,
    getCheckoutDetailsQuery: GET_CHECKOUT_DETAILS,
    getCustomerQuery: GET_CUSTOMER,
    getOrderDetailsQuery: GET_ORDER_DETAILS,
    placeOrderMutation: PLACE_ORDER,
    cardKnoxPlaceOrderMutation: PLACE_ORDER_CARD_KNOX,
    cardKnoxStaticPlaceOrderMutation: PLACE_ORDER_CARD_KNOX_STATIC,
    validateCartAddressMutation: VALIDATE_CUSTOMER_CART_ADDRESS
};
