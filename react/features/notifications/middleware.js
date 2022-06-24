/* @flow */

import { getCurrentConference } from '../base/conference';
import {
    PARTICIPANT_JOINED,
    PARTICIPANT_LEFT,
    PARTICIPANT_ROLE,
    PARTICIPANT_UPDATED,
    getParticipantById,
    getParticipantDisplayName,
    getLocalParticipant
} from '../base/participants';
import { MiddlewareRegistry, StateListenerRegistry } from '../base/redux';
import { PARTICIPANTS_PANE_OPEN } from '../participants-pane/actionTypes';

import {
    CLEAR_NOTIFICATIONS,
    HIDE_NOTIFICATION,
    SHOW_NOTIFICATION
} from './actionTypes';
import {
    clearNotifications,
    hideNotification,
    showNotification,
    showParticipantJoinedNotification,
    showParticipantLeftNotification
} from './actions';
import {
    NOTIFICATION_TIMEOUT_TYPE,
    RAISE_HAND_NOTIFICATION_ID
} from './constants';
import { areThereNotifications, joinLeaveNotificationsDisabled } from './functions';

/**
 * Map of timers.
 *
 * @type {Map}
 */
const timers = new Map();

/**
 * Function that creates a timeout id for specific notification.
 *
 * @param {Object} notification - Notification for which we want to create a timeout.
 * @param {Function} dispatch - The Redux dispatch function.
 * @returns {void}
 */
const createTimeoutId = (notification, dispatch) => {
    const {
        timeout,
        uid
    } = notification;

    if (timeout) {
        const timerID = setTimeout(() => {
            dispatch(hideNotification(uid));
        }, timeout);

        timers.set(uid, timerID);
    }
};

/**
 * Returns notifications state.
 *
 * @param {Object} state - Global state.
 * @returns {Array<Object>} - Notifications state.
 */
const getNotifications = state => {
    const _visible = areThereNotifications(state);
    const { notifications } = state['features/notifications'];

    return _visible ? notifications : [];
};

import {
    HIDE_NOTIFICATION
} from './actionTypes';

const _MESSAGE_DISSMISED_COMMAND = 'messageDismissed';
/**
 * Middleware that captures actions to display notifications.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => action => {

    const { dispatch, getState } = store;
    const state = getState();

    switch (action.type) {
    case PARTICIPANT_UPDATED: {
        const { disableModeratorIndicator } = state['features/base/config'];

        if (disableModeratorIndicator) {
            return next(action);
        }

        const { id, role } = action.participant;
        const localParticipant = getLocalParticipant(state);

        if (localParticipant?.id !== id) {
            return next(action);
        }

        const oldParticipant = getParticipantById(state, id);
        const oldRole = oldParticipant?.role;

        if (oldRole && oldRole !== role && role === PARTICIPANT_ROLE.MODERATOR) {

            store.dispatch(showNotification({
                titleKey: 'notify.moderator'
            },
            NOTIFICATION_TIMEOUT_TYPE.SHORT));
        }

        return next(action);
    }
    case PARTICIPANTS_PANE_OPEN: {
        store.dispatch(hideNotification(RAISE_HAND_NOTIFICATION_ID));
        break;
    }
    }

    return next(action);
});

/**
 * StateListenerRegistry provides a reliable way to detect the leaving of a
 * conference, where we need to clean up the notifications.
 */
StateListenerRegistry.register(
    /* selector */ state => getCurrentConference(state),
    /* listener */ (conference, { dispatch }) => {
        if (!conference) {
            dispatch(clearNotifications());
        }
    }
);
