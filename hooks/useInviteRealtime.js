// Real-time subscription hook for invite updates
import { useEffect, useCallback } from 'react';
import { supabase } from '../screens/supabaseClient';

/**
 * Hook to subscribe to real-time invite updates
 * @param {string} inviteId - The invite ID to subscribe to
 * @param {Function} onAccepted - Callback when invite is accepted
 * @param {Function} onDeclined - Callback when invite is declined
 * @returns {Object} - Subscription status and controls
 */
export function useInviteRealtime(inviteId, onAccepted, onDeclined) {
  useEffect(() => {
    if (!inviteId) {
      console.log('⏭️ No invite ID provided, skipping real-time subscription');
      return;
    }

    console.log('📡 Setting up real-time subscription for invite:', inviteId);
    
    const channelName = `invite:${inviteId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    // Subscribe to invite updates
    channel
      .on('broadcast', { event: 'invite.accepted' }, (payload) => {
        const { inviteId: acceptedId, acceptedBy, acceptedAt } = payload?.payload || {};
        console.log('🎉 Real-time: Invite accepted!', { acceptedId, acceptedBy, acceptedAt });
        
        if (acceptedId === inviteId && onAccepted) {
          onAccepted({ inviteId: acceptedId, acceptedBy, acceptedAt });
        }
      })
      .on('broadcast', { event: 'invite.declined' }, (payload) => {
        const { inviteId: declinedId, declinedBy } = payload?.payload || {};
        console.log('❌ Real-time: Invite declined', { declinedId, declinedBy });
        
        if (declinedId === inviteId && onDeclined) {
          onDeclined({ inviteId: declinedId, declinedBy });
        }
      })
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Unsubscribing from invite real-time channel:', channelName);
      channel.unsubscribe();
    };
  }, [inviteId, onAccepted, onDeclined]);

  return {
    // Can expose methods here if needed
  };
}

/**
 * Hook to subscribe to all invite updates for current user
 * @param {string} userId - The current user ID
 * @param {Function} onUpdate - Callback when any invite is updated
 */
export function useMyInvitesRealtime(userId, onUpdate) {
  useEffect(() => {
    if (!userId) {
      console.log('⏭️ No user ID provided, skipping invites real-time subscription');
      return;
    }

    console.log('📡 Setting up real-time subscription for user invites:', userId);
    
    const channelName = `user-invites:${userId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    // Subscribe to all invite updates for this user
    channel
      .on('broadcast', { event: 'invite.updated' }, (payload) => {
        console.log('🔄 Real-time: Invite updated', payload?.payload);
        
        if (onUpdate) {
          onUpdate(payload?.payload);
        }
      })
      .subscribe((status) => {
        console.log('📡 User invites subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Unsubscribing from user invites channel:', channelName);
      channel.unsubscribe();
    };
  }, [userId, onUpdate]);

  return {
    // Can expose methods here if needed
  };
}

