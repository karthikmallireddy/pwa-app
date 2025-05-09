import { useShippingInformation } from '@magento/peregrine/lib/talons/CheckoutPage/ShippingInformation/useShippingInformation';
import { func, shape, string } from 'prop-types';
import React, { Fragment, Suspense } from 'react';
import { Edit2 as EditIcon, Plus as PlusIcon } from 'react-feather';
import { FormattedMessage } from 'react-intl';

import { useStyle } from '../../../classify';
import Icon from '../../Icon';
import LinkButton from '../../LinkButton';
import LoadingIndicator from '../../LoadingIndicator';
import AddressForm from './AddressForm';
import Card from './card';
import defaultClasses from './shippingInformation.module.css';


const EditModal = React.lazy(() => import('./editModal'));

const ShippingInformation = props => {
    const {
        classes: propClasses,
        onSave,
        onSuccess,
        toggleActiveContent,
        toggleSignInContent,
        setGuestSignInUsername
    } = props;
    const talonProps = useShippingInformation({
        onSave,
        toggleActiveContent
    });
    const {
        doneEditing,
        handleEditShipping,
        hasUpdate,
        isSignedIn,
        isLoading,
        shippingData
    } = talonProps;

    const classes = useStyle(defaultClasses, propClasses);

    const rootClassName = !doneEditing
        ? classes.root_editMode
        : hasUpdate
        ? classes.root_updated
        : classes.root;

    if (isLoading) {
        return (
            <LoadingIndicator classes={{ root: classes.loading }}>
                <FormattedMessage
                    id={'shippingInformation.loading'}
                    defaultMessage={'Fetching Shipping Information...'}
                />
            </LoadingIndicator>
        );
    }

    const editModal = !isSignedIn ? (
        <Suspense fallback={null}>
            <EditModal onSuccess={onSuccess} shippingData={shippingData} />
        </Suspense>
    ) : null;

    const shippingInformation = doneEditing ? (
        <Fragment>
            <div className="step-header">
                <h3>
                    <FormattedMessage
                        id={'ShippingInformation.shippingAddress'}
                        defaultMessage={'SHIPPING ADDRESS'}
                    />
                </h3>
                <LinkButton
                    onClick={handleEditShipping}
                    className={classes.editButton}
                    data-cy="ShippingInformation-editButton"
                >
                    <Icon
                        size={20}
                        src={PlusIcon}
                        classes={{ icon: classes.plusIcon }}
                    />
                   <FormattedMessage
                        id={'ShippingInformation.newAddress'}
                        defaultMessage={'New Address'}
                    />
                </LinkButton>
            </div>
            <div className="shipping-adderss-card">
                <div className={classes.cardHeader}>
                    {/* <h5 className={classes.cardTitle}>
                    <FormattedMessage
                        id={'shippingInformation.cardTitle'}
                        defaultMessage={'Shipping Information'}
                    />
                </h5> */}
                    <LinkButton
                        onClick={handleEditShipping}
                        className={classes.editButton}
                        data-cy="ShippingInformation-editButton"
                    >
                        <Icon
                            size={16}
                            src={EditIcon}
                            classes={{ icon: classes.editIcon }}
                        />
                        <span className={classes.editText}>
                            <FormattedMessage
                                id={'global.editButton'}
                                defaultMessage={'Edit'}
                            />
                        </span>
                    </LinkButton>
                </div>
                <Card shippingData={shippingData} />
                {editModal}
            </div>
        </Fragment>
    ) : (
        <Fragment>
            <h3
                data-cy="ShippingInformation-editTitle"
                className={classes.editTitle}
            >
                <FormattedMessage
                    id={'shippingInformation.editTitle'}
                    defaultMessage={'Shipping Information'}
                />
            </h3>
            <div className={classes.editWrapper}>
                <AddressForm
                    onSuccess={onSuccess}
                    shippingData={shippingData}
                    toggleSignInContent={toggleSignInContent}
                    setGuestSignInUsername={setGuestSignInUsername}
                />
            </div>
        </Fragment>
    );

    return (
        <div className={rootClassName} data-cy="ShippingInformation-root">
            {shippingInformation}
        </div>
    );
};

export default ShippingInformation;

ShippingInformation.propTypes = {
    classes: shape({
        root: string,
        root_editMode: string,
        cardHeader: string,
        cartTitle: string,
        editWrapper: string,
        editTitle: string,
        editButton: string,
        editIcon: string,
        editText: string
    }),
    onSave: func.isRequired,
    onSuccess: func.isRequired,
    toggleActiveContent: func.isRequired,
    toggleSignInContent: func.isRequired,
    setGuestSignInUsername: func.isRequired
};
