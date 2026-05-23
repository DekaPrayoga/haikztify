package com.haikztify.app.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "Boot completed — app ready to launch on demand")
            // We don't auto-start the service on boot,
            // but the app is registered so the user can open it immediately.
            // If you want auto-resume, uncomment:
            // val launchIntent = Intent(context, com.haikztify.app.ui.MainActivity::class.java)
            // launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            // context.startActivity(launchIntent)
        }
    }
}
