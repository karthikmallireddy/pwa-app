import { useCallback, useEffect, useState, useMemo } from 'react';
import { useFormState, useFormApi } from 'informed';
import { useQuery, useApolloClient, useMutation } from '@apollo/client';
import mergeOperations from '@magento/peregrine/lib/util/shallowMerge';

import { useCartContext } from '../../../context/cart';

import DEFAULT_OPERATIONS from './creditCard.gql';

const getRegion = region => {
    return region.region_id || region.label || region.code;
};

/**
 * Maps address response data from GET_BILLING_ADDRESS and GET_SHIPPING_ADDRESS
 * queries to input names in the billing address form.
 * {@link creditCard.gql.js}.
 *
 * @param {ShippingCartAddress|BillingCartAddress} rawAddressData query data
 */
export const mapAddressData = rawAddressData => {
    if (rawAddressData) {
        const {
            firstName,
            lastName,
            city,
            postcode,
            phoneNumber,
            street,
            country,
            region
        } = rawAddressData;

        return {
            firstName,
            lastName,
            city,
            postcode,
            phoneNumber,
            street1: street[0],
            street2: street[1] || '',
            country: country.code,
            region: getRegion(region)
        };
    } else {
        return {};
    }
};

/**
 * Talon to handle Credit Card payment method.
 *
 * @param {Boolean} props.shouldSubmit boolean value which represents if a payment nonce request has been submitted
 * @param {Function} props.onSuccess callback to invoke when the a payment nonce has been generated
 * @param {Function} props.onReady callback to invoke when the braintree dropin component is ready
 * @param {Function} props.onError callback to invoke when the braintree dropin component throws an error
 * @param {Function} props.resetShouldSubmit callback to reset the shouldSubmit flag
 * @param {DocumentNode} props.operations.getBillingAddressQuery query to fetch billing address from cache
 * @param {DocumentNode} props.operations.getIsBillingAddressSameQuery query to fetch is billing address same checkbox value from cache
 * @param {DocumentNode} props.operations.getPaymentNonceQuery query to fetch payment nonce saved in cache
 * @param {DocumentNode} props.operations.setBillingAddressMutation mutation to update billing address on the cart
 * @param {DocumentNode} props.operations.setCreditCardDetailsOnCartMutation mutation to update payment method and payment nonce on the cart
 *
 * @returns {
 *   errors: Map<String, Error>,
 *   shouldRequestPaymentNonce: Boolean,
 *   onPaymentError: Function,
 *   onPaymentSuccess: Function,
 *   onPaymentReady: Function,
 *   isBillingAddressSame: Boolean,
 *   isLoading: Boolean,
 *   stepNumber: Number,
 *   initialValues: {
 *      firstName: String,
 *      lastName: String,
 *      city: String,
 *      postcode: String,
 *      phoneNumber: String,
 *      street1: String,
 *      street2: String,
 *      country: String,
 *      state: String,
 *      isBillingAddressSame: Boolean
 *   },
 *   shippingAddressCountry: String,
 *   shouldTeardownDropin: Boolean,
 *   resetShouldTeardownDropin: Function
 * }
 */
export const useCreditCard = props => {
    const {
        onSuccess,
        onReady,
        onError,
        shouldSubmit,
        resetShouldSubmit
    } = props;

    const operations = mergeOperations(DEFAULT_OPERATIONS, props.operations);

    const {
        getBillingAddressQuery,
        getIsBillingAddressSameQuery,
        getShippingAddressQuery,
        setBillingAddressMutation
    } = operations;

  

    /**
     * Definitions
     */

  
    const [shouldRequestPaymentNonce, setShouldRequestPaymentNonce] = useState(
        false
    );

    /**
     * `stepNumber` depicts the state of the process flow in credit card
     * payment flow.
     *
     * `0` No call made yet
     * `1` Billing address mutation initiated
     * `2` Braintree nonce requested
     * `3` Payment information mutation initiated
     * `4` All mutations done
     */
    const [stepNumber, setStepNumber] = useState(0);

    const client = useApolloClient();
    const formState = useFormState();
    const { validate: validateBillingAddressForm } = useFormApi();
    const [{ cartId }] = useCartContext();

    const isLoading =(stepNumber >= 1 && stepNumber <= 3);

    const { data: billingAddressData } = useQuery(getBillingAddressQuery, {
        skip: !cartId,
        variables: { cartId }
    });
    const { data: shippingAddressData } = useQuery(getShippingAddressQuery, {
        skip: !cartId,
        variables: { cartId }
    });
    const { data: isBillingAddressSameData } = useQuery(
        getIsBillingAddressSameQuery,
        { skip: !cartId, variables: { cartId } }
    );
    const [
        updateBillingAddress,
        {
            error: billingAddressMutationError,
            called: billingAddressMutationCalled,
            loading: billingAddressMutationLoading
        }
    ] = useMutation(setBillingAddressMutation);



    const shippingAddressCountry = shippingAddressData
        ? shippingAddressData?.cart?.shippingAddresses?.[0]?.country.code
        : DEFAULT_COUNTRY_CODE;
    const isBillingAddressSame = formState.values.isBillingAddressSame;

    const initialValues = useMemo(() => {
        const isBillingAddressSame = isBillingAddressSameData
            ? isBillingAddressSameData.cart.isBillingAddressSame
            : true;

        let billingAddress = {};
        /**
         * If billing address is same as shipping address, do
         * not auto fill the fields.
         */
        if (billingAddressData && !isBillingAddressSame) {
            if (billingAddressData.cart.billingAddress) {
                const {
                    // eslint-disable-next-line no-unused-vars
                    __typename,
                    ...rawBillingAddress
                } = billingAddressData.cart.billingAddress;
                billingAddress = mapAddressData(rawBillingAddress);
            }
        }

        return { isBillingAddressSame, ...billingAddress };
    }, [isBillingAddressSameData, billingAddressData]);

    /**
     * Helpers
     */

    /**
     * This function sets the boolean isBillingAddressSame
     * in cache for future use. We use cache because there
     * is no way to save this on the cart in remote.
     */
    const setIsBillingAddressSameInCache = useCallback(() => {
        client.writeQuery({
            query: getIsBillingAddressSameQuery,
            data: {
                cart: {
                    __typename: 'Cart',
                    id: cartId,
                    isBillingAddressSame
                }
            }
        });
    }, [client, cartId, getIsBillingAddressSameQuery, isBillingAddressSame]);

    /**
     * This function sets the billing address on the cart using the
     * shipping address.
     */
    const setShippingAddressAsBillingAddress = useCallback(() => {
        var shippingAddress = shippingAddressData
            ? mapAddressData(shippingAddressData.cart.shippingAddresses[0])
            : {};

        shippingAddress.region =
            shippingAddress.region == null ? '' : shippingAddress.region;

        updateBillingAddress({
            variables: {
                cartId,
                ...shippingAddress,
                sameAsShipping: true
            }
        });
    }, [updateBillingAddress, shippingAddressData, cartId]);

    /**
     * This function sets the billing address on the cart using the
     * information from the form.
     */
    const setBillingAddress = useCallback(() => {
        const {
            firstName,
            lastName,
            country,
            street1,
            street2,
            city,
            region,
            postcode,
            phoneNumber
        } = formState.values;

        updateBillingAddress({
            variables: {
                cartId,
                firstName,
                lastName,
                country,
                street1,
                street2: street2 || '',
                city,
                region: getRegion(region),
                postcode,
                phoneNumber,
                sameAsShipping: false
            }
        });
    }, [formState.values, updateBillingAddress, cartId]);

   

    /**
     * Effects
     */

    /**
     * Step 1 effect
     *
     * User has clicked the update button
     */
    useEffect(() => {
        try {
            if (shouldSubmit) {
                /**
                 * Validate billing address fields and only process with
                 * submit if there are no errors.
                 *
                 * We do this because the user can click Review Order button
                 * without fillig in all fields and the form submission
                 * happens manually. The informed Form component validates
                 * on submission but that only happens when we use the onSubmit
                 * prop. In this case we are using manually submission because
                 * of the nature of the credit card submission process.
                 */
                validateBillingAddressForm();

                const hasErrors = Object.keys(formState.errors).length;

                if (!hasErrors) {
                    setStepNumber(1);
                    if (isBillingAddressSame) {
                        setShippingAddressAsBillingAddress();
                    } else {
                        setBillingAddress();
                    }
                    setIsBillingAddressSameInCache();
                } else {
                    throw new Error('Errors in the billing address form');
                }
            }
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.error(err);
            }
            setStepNumber(0);
            resetShouldSubmit();
            setShouldRequestPaymentNonce(false);
        }
    }, [
        shouldSubmit,
        isBillingAddressSame,
        setShippingAddressAsBillingAddress,
        setBillingAddress,
        setIsBillingAddressSameInCache,
        resetShouldSubmit,
        validateBillingAddressForm,
        formState.errors
    ]);

    /**
     * Step 2 effect
     *
     * Billing address mutation has completed
     */
    useEffect(() => {
        try {
            const billingAddressMutationCompleted =
                billingAddressMutationCalled && !billingAddressMutationLoading;

            if (
                billingAddressMutationCompleted &&
                !billingAddressMutationError
            ) {
                /**
                 * Billing address save mutation is successful
                 * we can initiate the braintree nonce request
                 */
                if (onSuccess) {
                                  onSuccess();
                               }
                resetShouldSubmit();
                setStepNumber(4);
                //setShouldRequestPaymentNonce(false);
            }

            if (
                billingAddressMutationCompleted &&
                billingAddressMutationError
            ) {
                /**
                 * Billing address save mutation is not successful.
                 * Reset update button clicked flag.
                 */
                throw new Error('Billing address mutation failed');
            }
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.error(err);
            }
            setStepNumber(0);
            resetShouldSubmit();
            setShouldRequestPaymentNonce(false);
        }
    }, [billingAddressMutationError, billingAddressMutationCalled, billingAddressMutationLoading, resetShouldSubmit, onSuccess]);

   

    const errors = useMemo(
        () =>
            new Map([
                ['setBillingAddressMutation', billingAddressMutationError],
                
            ]),
        [billingAddressMutationError]
    );

    return {
        errors,
        isBillingAddressSame,
        isLoading,
        shouldRequestPaymentNonce,
        stepNumber,
        initialValues,
        shippingAddressCountry
    };
};
