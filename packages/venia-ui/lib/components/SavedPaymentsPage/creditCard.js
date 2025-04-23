import React, { useMemo, useEffect } from 'react';
import { shape, string } from 'prop-types';
import { FormattedMessage, useIntl } from 'react-intl';
import {
    AlertCircle as AlertCircleIcon,
    Trash2 as DeleteIcon
} from 'react-feather';

import { useToasts } from '@magento/peregrine';
import { useCreditCard } from '@magento/peregrine/lib/talons/SavedPaymentsPage/useCreditCard';

import { useStyle } from '@magento/venia-ui/lib/classify';
import Button from '../Button';
import Icon from '../Icon';
import LinkButton from '../LinkButton';
import defaultClasses from './creditCard.module.css';

/**
 * Enumerated list of supported credit card types from
 *
 * https://github.com/magento/magento2/blob/2.4-develop/app/code/Magento/Payment/view/base/web/js/model/credit-card-validation/credit-card-number-validator/credit-card-type.js
 */
const cardTypeMapper = {
    AE: 'American Express',
    AU: 'Aura',
    Discover: 'Discover',
    DN: 'Diners',
    ELO: 'Elo',
    HC: 'Hipercard',
    JCB: 'JCB',
    MasterCard: 'MasterCard',
    MD: 'Maestro Domestic',
    MI: 'Maestro International',
    UN: 'UnionPay',
    Visa: 'Visa'
};

const errorIcon = <Icon src={AlertCircleIcon} size={20} />;

const CreditCard = props => {
    const { classes: propClasses, details, public_hash } = props;

    const talonProps = useCreditCard({ paymentHash: public_hash });
    const {
        handleDeletePayment,
        hasError,
        isConfirmingDelete,
        isDeletingPayment,
        toggleDeleteConfirmation,
        handleDefaultPayment
    } = talonProps;

    const { formatMessage } = useIntl();
    const [, { addToast }] = useToasts();

    useEffect(() => {
        if (hasError) {
            addToast({
                type: 'error',
                icon: errorIcon,
                message: formatMessage({
                    id: 'savedPaymentsPage.creditCard.errorRemoving',
                    defaultMessage:
                        'Something went wrong deleting this payment method. Please refresh and try again.'
                }),
                dismissable: true,
                timeout: 7000
            });
        }
    }, [addToast, formatMessage, hasError]);

    const classes = useStyle(defaultClasses, propClasses);

    const number = `${details.MaskedNumber} \u00A0\u00A0 ${cardTypeMapper[
        details.CardType
    ] || ''}`;
    const cardExpiryDate = useMemo(() => {
        if (!details.Exp || details.Exp.length !== 4) return '';
    
        const month = details.Exp.slice(0, 2); // "04"
        const year = `20${details.Exp.slice(2)}`; // "26" → "2026"
    
        const shortMonth = new Date(+year, +month - 1).toLocaleString(
            'default',
            { month: 'short' } // e.g., "Apr"
        );
    
        return `${shortMonth}. ${year}`;
    }, [details.Exp]);

    const rootClass = isConfirmingDelete ? classes.root_active : classes.root;

    const deleteButton = (
        <LinkButton
            classes={{ root: classes.deleteButton }}
            disabled={isConfirmingDelete}
            onClick={toggleDeleteConfirmation}
        >
            <Icon classes={{ icon: undefined }} size={16} src={DeleteIcon} />
            <span className={classes.deleteText}>
                <FormattedMessage
                    id={'storedPayments.delete'}
                    defaultMessage={'Delete'}
                />
            </span>
        </LinkButton>
    );


    const setAsDefaultButton = (
        <LinkButton
            classes={{ root: classes.deleteButton }}
            disabled={details?.IsDefaultPaymentMethod}
            onClick={handleDefaultPayment}
        >
           
            <span className={classes.deleteText}>
                <FormattedMessage
                    id={'storedPayments.setasdefault'}
                    defaultMessage={details?.IsDefaultPaymentMethod?"Default":'Set as Default'}
                />
            </span>
        </LinkButton>
    );

    const deleteConfirmationOverlayClass = isConfirmingDelete
        ? classes.deleteConfirmationContainer
        : classes.deleteConfirmationContainer_hidden;

    const deleteConfirmationOverlay = (
        <div className={deleteConfirmationOverlayClass}>
            <Button
                classes={{
                    root_normalPriorityNegative: classes.confirmDeleteButton
                }}
                disabled={isDeletingPayment}
                onClick={handleDeletePayment}
                negative={true}
                priority="normal"
                type="button"
            >
                <FormattedMessage
                    id={'global.deleteButton'}
                    defaultMessage={'Delete'}
                />
            </Button>
            <Button
                classes={{ root_lowPriority: classes.cancelDeleteButton }}
                disabled={isDeletingPayment}
                onClick={toggleDeleteConfirmation}
                priority="low"
                type="button"
            >
                <FormattedMessage
                    id={'global.cancelButton'}
                    defaultMessage={'Cancel'}
                />
            </Button>
        </div>
    );

    return (
        <div className={rootClass}>
            <div className={classes.title}>
                <FormattedMessage
                    id={'storedPayments.creditCard'}
                    defaultMessage={'Credit Card'}
                />
            </div>
            <div className={classes.number}>{number}</div>
            <div className={classes.expiry_date}>{cardExpiryDate}</div>
            <div className={classes.delete}>{setAsDefaultButton}</div>
            {/* {deleteConfirmationOverlay} */}
        </div>
    );
};

export default CreditCard;

CreditCard.propTypes = {
    classes: shape({
        delete: 'string',
        deleteButton: 'string',
        deleteConfirmationContainer: 'string',
        deleteConfirmationContainer_hidden: 'string',
        expiry_date: 'string',
        number: 'string',
        root_selected: 'string',
        root: 'string',
        title: 'string'
    }),
    details: shape({
        expirationDate: string,
        maskedCC: string,
        type: string
    })
};
