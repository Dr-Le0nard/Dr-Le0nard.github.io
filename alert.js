async function initRealtimeAlert() {
    // 1. Create the banner element in the UI
    const banner = document.createElement('div');
    banner.id = "global-alert-banner";
    banner.style = "display:none; background:red; color:white; padding:10px; text-align:center; font-weight:bold; position:fixed; top:0; left:0; width:100%; z-index:10000; border-bottom: 2px solid white;";
    document.body.prepend(banner);

    // 2. Check initial status
    const { data: initial } = await _supabase
        .from('system_status')
        .select('*')
        .limit(1)
        .single();

    if (initial && initial.is_active) {
        showAlert(initial.alert_message);
    }

    // 3. Listen for REALTIME updates
    _supabase
        .channel('system_alerts')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_status' }, payload => {
            const status = payload.new;
            if (status.is_active) {
                showAlert(status.alert_message);
            } else {
                hideAlert();
            }
        })
        .subscribe();
}

async function securityPulse() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    if (user) {
        const { data: profile } = await _supabase
            .from('profiles')
            .select('is_approved')
            .eq('id', user.id)
            .single();

        // If the profile is found but they are no longer approved
        if (profile && profile.is_approved === false) {
            console.error("SECURITY_REVOKED: TERMINATING_SESSION");
            await _supabase.auth.signOut();
            window.location.href = "index.html?error=access_revoked";
        }
    }
}

// Start the pulse check every 30 seconds
setInterval(securityPulse, 30000);

function showAlert(msg) {
    const banner = document.getElementById('global-alert-banner');
    banner.innerText = "!!! ALERT: " + msg + " !!!";
    banner.style.display = 'block';
    // Add a simple CSS flicker effect
    banner.classList.add('flicker-animation');
}

function hideAlert() {
    document.getElementById('global-alert-banner').style.display = 'none';
}

// Start listening once the window loads
window.addEventListener('load', initRealtimeAlert);
