package it.case247.andrea;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context ctx,Intent intent) {
        Scheduler.scheduleDaily(ctx);
        new AgendaStore(ctx).scheduleOutstanding(ctx);
    }
}
