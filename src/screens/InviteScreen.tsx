import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Button, Platform, Share as NativeShare, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../../screens/supabaseClient'
import Toast from '../../components/Toast'
import { useInvitesStore } from '../state/invites'

export default function InviteScreen() {
  const [inviteeIdentifier, setInviteeIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const upsertTransaction = useInvitesStore((s) => s.upsertTransaction)
  const setAccepted = useInvitesStore((s) => s.setAccepted)

  const [channelName, setChannelName] = useState<string | null>(null)
  const channel = useMemo(() => (channelName ? supabase.channel(channelName, { config: { broadcast: { self: false } } }) : null), [channelName])

  useEffect(() => {
    if (!channel) return
    const sub = channel
      .on('broadcast', { event: 'transaction-accepted' }, (payload: any) => {
        const { transactionId, acceptedAt, inviteeId } = payload?.payload || {}
        console.log('🎉 Real-time notification: Invite accepted!', { transactionId, acceptedAt, inviteeId })
        if (transactionId) {
          setAccepted(transactionId, acceptedAt)
          setToast('🎉 Invite accepted! Your transaction is being processed.')
        }
      })
      .on('broadcast', { event: 'transaction-declined' }, (payload: any) => {
        const { transactionId } = payload?.payload || {}
        console.log('❌ Real-time notification: Invite declined', { transactionId })
        if (transactionId) {
          setToast('Invite was declined')
        }
      })
      .subscribe((status) => {
        console.log('📡 Realtime channel subscription status:', status)
      })

    return () => {
      try { 
        console.log('🔌 Unsubscribing from realtime channel')
        channel.unsubscribe() 
      } catch {}
    }
  }, [channel, setAccepted])

  const onCreateInvite = useCallback(async () => {
    try {
      setLoading(true)
      const sessionRes = await supabase.auth.getSession()
      const jwt = sessionRes.data.session?.access_token
      if (!jwt) throw new Error('Not authenticated')

      const projectRef = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF
      if (!projectRef) throw new Error('Missing EXPO_PUBLIC_SUPABASE_PROJECT_REF')

      const resp = await fetch(`https://${projectRef}.functions.supabase.co/create-invite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ inviteeIdentifier: inviteeIdentifier || undefined }),
      })
      if (!resp.ok) throw new Error(`Failed to create invite (${resp.status})`)
      const json = await resp.json()
      const { transactionId, url } = json
      upsertTransaction({ id: transactionId, status: 'pending', url })
      setChannelName(`transaction:${transactionId}`)

      if (Platform.OS !== 'web') {
        await NativeShare.share({ message: url, url })
      }
    } catch (e: any) {
      setToast(e.message || 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }, [inviteeIdentifier, upsertTransaction])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite a friend</Text>
      <TextInput
        value={inviteeIdentifier}
        onChangeText={setInviteeIdentifier}
        placeholder="Email or phone (optional)"
        style={styles.input}
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <Button title={loading ? 'Creating…' : 'Create Invite'} onPress={onCreateInvite} disabled={loading} />
        {loading && <ActivityIndicator style={{ marginLeft: 12 }} />}
      </View>
      <Toast message={toast || ''} visible={!!toast} onHide={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
})


