package it.regia.diplomaguadagno;
import android.Manifest;
import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.provider.AlarmClock;
import android.media.*;
import android.graphics.Color;
import android.view.*;
import android.widget.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
public class MainActivity extends Activity {
 static final String URL="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/diploma-guadagno/";
 static final String CHANNEL="regia_v1";
 static final int ALL=127, SCHOOL=31, WORK=63, SAT=32, SUN=64;
 static final ZoneId ZONE=ZoneId.of("Europe/Rome");
 static final LocalDate END=LocalDate.of(2027,6,30);
 static final class Slot { final int h,m,days; final String title,detail; Slot(int h,int m,int d,String t,String s){this.h=h;this.m=m;days=d;title=t;detail=s;} String time(){return String.format(java.util.Locale.ITALY,"%02d:%02d",h,m);} }
 static final Slot[] S={
 new Slot(6,25,ALL,"Sveglia","Alzati e preparati."),
 new Slot(6,35,ALL,"Studio OCME","40 minuti per il diploma."),
 new Slot(7,15,ALL,"Fine studio","Registra il risultato."),
 new Slot(8,0,ALL,"Inizio lavoro","Lead e richiami autorizzati."),
 new Slot(9,0,ALL,"Articoli, email e lettere","Apri il centro testi."),
 new Slot(10,30,ALL,"Pubblicazioni e farming","Controlla contenuti e QR."),
 new Slot(12,0,WORK,"Pausa pranzo","Pranzo e riposo."),
 new Slot(12,45,WORK,"Ripasso spaziato","15 minuti di richiamo."),
 new Slot(14,0,WORK,"Contatti e follow-up","Risposte e richiami."),
 new Slot(15,30,WORK,"Controllo risultati","Aggiorna KPI e CRM."),
 new Slot(15,45,SCHOOL,"Stop lavoro","Vai in stazione."),
 new Slot(16,5,SCHOOL,"Treno imminente","Mancano dieci minuti."),
 new Slot(16,15,SCHOOL,"Partenza treno","Treno per scuola."),
 new Slot(17,0,SCHOOL,"Inizio scuola","Controlla le lezioni."),
 new Slot(21,25,SCHOOL,"Fine scuola","Rientro e cena."),
 new Slot(22,30,ALL,"Preparati per il riposo","Prepara il materiale."),
 new Slot(22,45,ALL,"Ora di dormire","Proteggi il sonno."),
 new Slot(16,0,SAT,"Sabato: fine lavoro","Pausa prima dello studio."),
 new Slot(17,0,SAT,"Sabato: recupero","40 minuti di studio."),
 new Slot(12,0,SUN,"Domenica: fine lavoro","Pranzo e riposo."),
 new Slot(13,30,SUN,"Domenica: pianificazione","Aggiorna orario e ripassi."),
 new Slot(14,30,SUN,"Domenica: recupero","40 minuti di studio."),
 new Slot(9,45,ALL,"Social pronti","Verifica post e script."),
 new Slot(11,15,ALL,"Farming e controlli","Apri percorso e materiali."),
 new Slot(15,15,SCHOOL,"Confronto partner","Apri riepilogo e richieste.")};
 static boolean enabled(Context c){return c.getSharedPreferences("regia",0).getBoolean("enabled",false);}
 static boolean exact(Context c){return Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();}
 static boolean notifications(Context c){return c.getSystemService(NotificationManager.class).areNotificationsEnabled()&&(Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED);}
 static PendingIntent pending(Context c,int i){Intent in=new Intent(c,AlarmReceiver.class).putExtra("slot",i);return PendingIntent.getBroadcast(c,i,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static ZonedDateTime next(int i,ZonedDateTime now){Slot s=S[i];for(int d=0;d<=7;d++){LocalDate date=now.toLocalDate().plusDays(d);if(date.isAfter(END))return null;if((s.days&(1<<(date.getDayOfWeek().getValue()-1)))==0)continue;ZonedDateTime at=date.atTime(s.h,s.m).atZone(ZONE);if(at.isAfter(now))return at;}return null;}
 static void plan(Context c,int i){AlarmManager a=c.getSystemService(AlarmManager.class);PendingIntent p=pending(c,i);a.cancel(p);if(!enabled(c))return;ZonedDateTime n=next(i,ZonedDateTime.now(ZONE));if(n==null)return;long ms=n.toInstant().toEpochMilli();try{if(exact(c)){PendingIntent show=PendingIntent.getActivity(c,700+i,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);a.setAlarmClock(new AlarmManager.AlarmClockInfo(ms,show),p);}}catch(SecurityException e){android.util.Log.w("Regia","Permesso sveglie non disponibile",e);}}
 static void planAll(Context c){for(int i=0;i<S.length;i++)plan(c,i);}
 static void channel(Context c){NotificationChannel ch=new NotificationChannel(CHANNEL,"Cadenze Diploma e Guadagno",NotificationManager.IMPORTANCE_HIGH);ch.setDescription("Avvisi giornalieri con suono e vibrazione");ch.enableVibration(true);Uri sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);if(sound==null)sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);ch.setSound(sound,new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());c.getSystemService(NotificationManager.class).createNotificationChannel(ch);}
 static void notifySlot(Context c,int i){channel(c);if(!notifications(c))return;Intent in=new Intent(c,RingingService.class).putExtra("slot",i);try{c.startForegroundService(in);}catch(RuntimeException e){android.util.Log.w("Regia","Avvio suoneria non riuscito",e);Intent open=new Intent(c,MainActivity.class);PendingIntent pi=PendingIntent.getActivity(c,510,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);c.getSystemService(NotificationManager.class).notify(890,new Notification.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("Avviso: "+(i<0?"Prova":S[i].title)).setContentText("Suoneria continua non avviata: controlla i permessi.").setContentIntent(pi).setAutoCancel(true).build());}}
 static final String REGIA="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/regia-operativa/";
 static final String[] SECTIONS={"giornata","studio","studio","crm","email","social","giornata","ripasso","richiami","report","giornata","giornata","giornata","studio","giornata","giornata","giornata","report","studio","report","giornata","ripasso","social","farming","partner"};
 void browse(String target){try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(target)));}catch(ActivityNotFoundException e){Toast.makeText(this,"Nessuna app disponibile",Toast.LENGTH_LONG).show();}}
 boolean calendarAllowed(){return checkSelfPermission(Manifest.permission.READ_CALENDAR)==PackageManager.PERMISSION_GRANTED;}
 int pendingStudy=-1; String pendingDate="";
 void openWork(int i,String date){if(i<0||i>=SECTIONS.length)i=3;stopAlarm(this);String target=REGIA+"?date="+Uri.encode(date)+"&section="+SECTIONS[i];
 if(i==1||i==7||i==18||i==21){if(!calendarAllowed()){pendingStudy=i;pendingDate=date;requestPermissions(new String[]{Manifest.permission.READ_CALENDAR},41);return;}openStudy(i,date,target);}else browse(target);}
 void openStudy(int i,String date,String target){final int slot=i; final String day=date; final String page=target;new Thread(()->{
  ArrayList<String> urls=new ArrayList<>(), labels=new ArrayList<>();String eventTitle="";boolean failed=false;
  try{
   LocalDate d=LocalDate.parse(day);long from=d.atStartOfDay(ZONE).toInstant().toEpochMilli(),to=d.plusDays(1).atStartOfDay(ZONE).toInstant().toEpochMilli();
   Uri.Builder b=android.provider.CalendarContract.Instances.CONTENT_URI.buildUpon();ContentUris.appendId(b,from);ContentUris.appendId(b,to);
   String[] projection={android.provider.CalendarContract.Instances.TITLE,android.provider.CalendarContract.Instances.DESCRIPTION,android.provider.CalendarContract.Instances.BEGIN};
   try(android.database.Cursor c=getContentResolver().query(b.build(),projection,null,null,android.provider.CalendarContract.Instances.BEGIN+" ASC")){
    if(c!=null)while(c.moveToNext()){String t=c.getString(0),desc=c.getString(1);if(t==null||desc==null||!t.startsWith("D&G"))continue;
     String low=t.toLowerCase(java.util.Locale.ROOT);boolean match=slot==7?low.contains("ripasso"):slot==1?low.contains("inizia studio"):low.contains("recupero");if(!match)continue;
     int minute=Instant.ofEpochMilli(c.getLong(2)).atZone(ZONE).getHour()*60+Instant.ofEpochMilli(c.getLong(2)).atZone(ZONE).getMinute();if(Math.abs(minute-(S[slot].h*60+S[slot].m))>10)continue;
     java.util.regex.Matcher mat=java.util.regex.Pattern.compile("https://(?:drive\\.google\\.com|docs\\.google\\.com|classroom\\.google\\.com)/[^\\s<>\\\"']+").matcher(desc);
     while(mat.find()){String u=mat.group().replace("&amp;","&").replaceAll("[).,;]+$","");Uri parsed=Uri.parse(u);String host=parsed.getHost();if(!("drive.google.com".equals(host)||"docs.google.com".equals(host)||"classroom.google.com".equals(host))||urls.contains(u))continue;String prefix=desc.substring(0,mat.start());int line=prefix.lastIndexOf('\n');String label=prefix.substring(line+1).replaceAll("[: ]+$","").trim();labels.add(label.isEmpty()?"Appunti originali "+(urls.size()+1):label);urls.add(u);}
     if(!urls.isEmpty()){eventTitle=t;break;}
    }
   }
  }catch(Exception e){failed=true;android.util.Log.w("Regia","Lettura calendario non riuscita",e);}
  final String title=eventTitle; final boolean err=failed;runOnUiThread(()->{if(isFinishing()||isDestroyed())return;if(urls.isEmpty()){new AlertDialog.Builder(this).setTitle("Appunti non sincronizzati").setMessage(err?"Non riesco a leggere il calendario del telefono.":"Nessun collegamento originale trovato per questa sveglia nel calendario del telefono. Verifica la sincronizzazione Google Calendar.").setPositiveButton("Apri scheda studio",(a,b)->browse(page)).setNegativeButton("Apri agenda",(a,b)->browse("https://calendar.google.com/calendar/u/0/r/day/"+day.replace("-","/"))).show();return;}
   ArrayList<String> choices=new ArrayList<>(labels);choices.add("Scheda ed esercizi");new AlertDialog.Builder(this).setTitle(title.isEmpty()?"Appunti originali e studio":title).setItems(choices.toArray(new String[0]),(a,b)->browse(b<urls.size()?urls.get(b):page)).setNegativeButton("Chiudi",null).show();});
 }).start();}

 static void stopAlarm(Context c){c.stopService(new Intent(c,RingingService.class));}
 public static class StopReceiver extends BroadcastReceiver {public void onReceive(Context c,Intent in){stopAlarm(c);}}
 public static class RingingService extends Service {
  static volatile boolean ringing=false;
  static volatile String title="", detail=""; static volatile int currentSlot=-1; static volatile String currentDate="";
  static final int ID=901;
  static final String RING_CHANNEL="regia_sveglia_continua_v2";
  MediaPlayer player; ToneGenerator tone; Vibrator vibrator; final Handler handler=new Handler(Looper.getMainLooper());
  final Runnable beep=new Runnable(){public void run(){if(ringing&&tone!=null){tone.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD,800);handler.postDelayed(this,1300);}}};
  void makeChannel(){NotificationChannel ch=new NotificationChannel(RING_CHANNEL,"Sveglie continue · STOP",NotificationManager.IMPORTANCE_HIGH);ch.setDescription("Suoneria continua gestita dall'app; premi STOP");ch.setSound(null,null);ch.enableVibration(false);ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);getSystemService(NotificationManager.class).createNotificationChannel(ch);}
  Notification notification(){Intent open=new Intent(this,MainActivity.class).putExtra("show_alert",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);PendingIntent pi=PendingIntent.getActivity(this,901,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);PendingIntent stop=PendingIntent.getBroadcast(this,902,new Intent(this,StopReceiver.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);PendingIntent work=PendingIntent.getActivity(this,903,new Intent(this,MainActivity.class).putExtra("open_work",true).putExtra("work_slot",currentSlot).putExtra("work_date",currentDate).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   Notification.Builder b=new Notification.Builder(this,RING_CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setColor(0xFFDC2626).setContentTitle(title).setContentText(detail+" · Premi STOP").setStyle(new Notification.BigTextStyle().bigText(detail+" · La sveglia suona fino a STOP")).setContentIntent(pi).setCategory(Notification.CATEGORY_ALARM).setOngoing(true).setVisibility(Notification.VISIBILITY_PUBLIC).addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause,"STOP",stop).build()).addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_view,"APRI LAVORO",work).build());
   if(Build.VERSION.SDK_INT>=31)b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
   if(Build.VERSION.SDK_INT<34||getSystemService(NotificationManager.class).canUseFullScreenIntent())b.setFullScreenIntent(pi,true);
   return b.build();}
  @Override public int onStartCommand(Intent in,int flags,int id){int i=in==null?-1:in.getIntExtra("slot",-1);if(i>=S.length||i< -1){stopSelf();return START_NOT_STICKY;}
   if(!notifications(this)){stopSelf();return START_NOT_STICKY;}
   currentSlot=i;currentDate=LocalDate.now(ZONE).toString();getSharedPreferences("regia",0).edit().putInt("last_slot",i).putString("last_date",currentDate).apply();title=i<0?"Prova sveglia":S[i].time()+" · "+S[i].title;detail=i<0?"Suoneria continua: premi STOP.":S[i].detail;
   makeChannel();startForeground(ID,notification());if(!ringing){ringing=true;startSound();startVibration();}return START_NOT_STICKY;}
  void startSound(){try{Uri uri=RingtoneManager.getActualDefaultRingtoneUri(this,RingtoneManager.TYPE_ALARM);if(uri==null)uri=Settings.System.DEFAULT_ALARM_ALERT_URI;player=new MediaPlayer();player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());player.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);player.setDataSource(this,uri);player.setLooping(true);player.setOnErrorListener((p,w,e)->{releasePlayer();fallback();return true;});player.prepare();player.start();}catch(Exception e){releasePlayer();fallback();}}
  void fallback(){if(!ringing||tone!=null)return;try{tone=new ToneGenerator(AudioManager.STREAM_ALARM,80);handler.post(beep);}catch(RuntimeException e){android.util.Log.e("Regia","Audio non disponibile",e);}}
  void releasePlayer(){if(player!=null){try{player.release();}catch(RuntimeException ignored){}player=null;}}
  void startVibration(){try{vibrator=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(vibrator!=null&&vibrator.hasVibrator())vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0,400,1600},0),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());}catch(RuntimeException e){android.util.Log.w("Regia","Vibrazione non disponibile",e);}}
  @Override public void onDestroy(){ringing=false;handler.removeCallbacksAndMessages(null);releasePlayer();if(tone!=null){tone.release();tone=null;}if(vibrator!=null)vibrator.cancel();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
  @Override public IBinder onBind(Intent in){return null;}
 }
 public static class AlarmReceiver extends BroadcastReceiver {public void onReceive(Context c,Intent in){int i=in.getIntExtra("slot",-1);if(i<0||i>=S.length||!enabled(c))return;plan(c,i);if(!LocalDate.now(ZONE).isAfter(END))notifySlot(c,i);}}
 public static class RestoreReceiver extends BroadcastReceiver {public void onReceive(Context c,Intent in){planAll(c);}}
 LinearLayout root; TextView state, alertBanner; ImageView alarmIcon; Button stopButton; final Handler pulseHandler=new Handler(Looper.getMainLooper()); boolean pulseOn=false;
 final Runnable pulse=new Runnable(){public void run(){
  if(alertBanner==null)return;
  boolean recent=RingingService.ringing;
  alertBanner.setVisibility(recent?View.VISIBLE:View.GONE);
  if(stopButton!=null)stopButton.setVisibility(recent?View.VISIBLE:View.GONE);
  if(recent){pulseOn=!pulseOn;alertBanner.setText(RingingService.title+"\n"+RingingService.detail);alertBanner.setBackgroundColor(pulseOn?0xFFDC2626:0xFF991B1B);alarmIcon.setAlpha(pulseOn?1f:0.55f);}
  else {alarmIcon.setAlpha(1f);if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(false);setTurnScreenOn(false);}}
  pulseHandler.postDelayed(this,700);
 }};

 void text(String x,int size){TextView v=new TextView(this);v.setText(x);v.setTextSize(size);v.setPadding(12,10,12,10);root.addView(v);}
 void button(String x,Runnable run){Button b=new Button(this);b.setText(x);b.setAllCaps(false);root.addView(b);b.setOnClickListener(v->run.run());}
 void nativeAlarm(int h,int m,String msg,boolean all){try{ArrayList<Integer> days=new ArrayList<>();for(int i=CalendarStart(all);i<=6;i++)days.add(i);if(all)days.add(7);Intent x=new Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR,h).putExtra(AlarmClock.EXTRA_MINUTES,m).putExtra(AlarmClock.EXTRA_MESSAGE,msg).putIntegerArrayListExtra(AlarmClock.EXTRA_DAYS,days).putExtra(AlarmClock.EXTRA_SKIP_UI,false);startActivity(x);}catch(ActivityNotFoundException e){Toast.makeText(this,"Apri manualmente l'app Orologio.",Toast.LENGTH_LONG).show();}}
 int CalendarStart(boolean all){return all?1:2;}
 void refresh(){if(state==null)return;state.setText((enabled(this)?"AVVISI ATTIVATI":"AVVISI DISATTIVATI")+"\nNotifiche: "+(notifications(this)?"OK":"permesso necessario")+"\nOrari precisi: "+(exact(this)?"OK":"permesso necessario; possibili ritardi"));}
 @Override public void onCreate(Bundle b){super.onCreate(b);channel(this);ScrollView scroll=new ScrollView(this);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(20,40,20,40);scroll.setFillViewport(true);scroll.addView(root);setContentView(scroll);alarmIcon=new ImageView(this);alarmIcon.setImageResource(R.drawable.ic_regia_alarm);alarmIcon.setContentDescription("Sveglia rossa Diploma e Guadagno");int size=(int)(100*getResources().getDisplayMetrics().density);LinearLayout.LayoutParams ip=new LinearLayout.LayoutParams(size,size);ip.gravity=Gravity.CENTER_HORIZONTAL;root.addView(alarmIcon,ip);alertBanner=new TextView(this);alertBanner.setTextColor(Color.WHITE);alertBanner.setTextSize(20);alertBanner.setPadding(20,20,20,20);alertBanner.setGravity(Gravity.CENTER);alertBanner.setVisibility(View.GONE);root.addView(alertBanner);stopButton=new Button(this);stopButton.setText("STOP SVEGLIA");stopButton.setTextSize(24);stopButton.setTextColor(Color.WHITE);stopButton.setBackgroundColor(0xFFB91C1C);stopButton.setMinHeight((int)(72*getResources().getDisplayMetrics().density));stopButton.setVisibility(View.GONE);root.addView(stopButton);stopButton.setOnClickListener(v->stopAlarm(this));button("APRI LAVORO DELLA SVEGLIA",()->{android.content.SharedPreferences p=getSharedPreferences("regia",0);openWork(p.getInt("last_slot",3),p.getString("last_date",LocalDate.now(ZONE).toString()));});button("AGENDA OPERATIVA OGGI",()->openWork(0,LocalDate.now(ZONE).toString()));text("DIPLOMA & GUADAGNO",24);text("25 sveglie continue • fino al 30 giugno 2027 • orario italiano",15);state=new TextView(this);state.setPadding(12,12,12,12);state.setTextSize(17);root.addView(state);button("1. Consenti notifiche",()->{if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},10);else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));});button("2. Consenti sveglie precise",()->{if(Build.VERSION.SDK_INT>=31&&!exact(this))startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));else Toast.makeText(this,"Permesso gia attivo",Toast.LENGTH_SHORT).show();});button("3. Consenti avvisi a schermo bloccato (facoltativo)",()->{if(Build.VERSION.SDK_INT>=34&&!getSystemService(NotificationManager.class).canUseFullScreenIntent())startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getPackageName())));else Toast.makeText(this,"Avvisi a schermo intero consentiti",Toast.LENGTH_SHORT).show();});button("Collega calendario privato (una volta)",()->{if(!calendarAllowed())requestPermissions(new String[]{Manifest.permission.READ_CALENDAR},41);else Toast.makeText(this,"Calendario collegato",Toast.LENGTH_SHORT).show();});button("4. Attiva tutte le cadenze",()->{if(!exact(this)||!notifications(this)){Toast.makeText(this,"Prima consenti notifiche e sveglie precise",Toast.LENGTH_LONG).show();return;}getSharedPreferences("regia",0).edit().putBoolean("enabled",true).apply();planAll(this);refresh();});button("Disattiva tutte le cadenze",()->{getSharedPreferences("regia",0).edit().putBoolean("enabled",false).apply();planAll(this);stopAlarm(this);refresh();});button("PROVA SVEGLIA CONTINUA",()->{if(!notifications(this)){Toast.makeText(this,"Consenti prima le notifiche",Toast.LENGTH_LONG).show();return;}notifySlot(this,-1);});button("Imposta sveglia vera 06:25 nell'Orologio",()->nativeAlarm(6,25,"Sveglia Diploma e Guadagno",true));button("Imposta sveglia vera 16:05 lun-ven",()->nativeAlarm(16,5,"Treno alle 16:15",false));button("Apri dashboard",()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(URL))));text("Agenda delle cadenze",20);for(int k=0;k<S.length;k++){final int ix=k;Slot s=S[k];button(s.time()+" · "+s.title+" · "+(s.days==ALL?"Tutti i giorni":s.days==SCHOOL?"Lun–Ven":s.days==WORK?"Lun–Sab":s.days==SAT?"Sab":"Dom"),()->openWork(ix,LocalDate.now(ZONE).toString()));}text("Ogni cadenza avvia una suoneria continua fino a STOP. Controlla volume sveglia, permessi e restrizioni batteria; usa la sveglia nativa come riserva per il risveglio. Gli appunti sono letti dal calendario sincronizzato del telefono, con autorizzazione di sola lettura. Disattiva i doppioni Google Calendar se necessario.",14);refresh();}
 @Override protected void onResume(){super.onResume();showOnLock(getIntent());handleWork(getIntent());refresh();if(enabled(this))planAll(this);pulseHandler.removeCallbacks(pulse);pulseHandler.post(pulse);}
 void showOnLock(Intent in){if(in!=null&&in.getBooleanExtra("show_alert",false)&&RingingService.ringing&&Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true);}}
 void handleWork(Intent in){if(in!=null&&in.getBooleanExtra("open_work",false)){in.removeExtra("open_work");openWork(in.getIntExtra("work_slot",3),in.getStringExtra("work_date")==null?LocalDate.now(ZONE).toString():in.getStringExtra("work_date"));}}
 @Override protected void onNewIntent(Intent in){super.onNewIntent(in);setIntent(in);showOnLock(in);handleWork(in);}
 @Override protected void onPause(){pulseHandler.removeCallbacks(pulse);super.onPause();}
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);refresh();if(r==41&&pendingStudy>=0){int i=pendingStudy;String d=pendingDate;pendingStudy=-1;if(calendarAllowed())openWork(i,d);else browse(REGIA+"?date="+Uri.encode(d)+"&section="+SECTIONS[i]);}}
}
