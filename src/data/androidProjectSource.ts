export interface AndroidSourceFile {
  path: string;
  title: string;
  module: string;
  code: string;
}

export const ANDROID_KOTLIN_FILES: AndroidSourceFile[] = [
  {
    path: 'app/build.gradle.kts',
    title: 'Gradle Build Config (Kotlin, Compose, Room, Media3 ExoPlayer)',
    module: 'Build & APK',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.kamy.musicplayer"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kamy.musicplayer"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "2.0.0-offline"
    }

    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")

    // Room Database + SQLite Local Persistence
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:\$roomVersion")
    implementation("androidx.room:room-ktx:\$roomVersion")
    ksp("androidx.room:room-compiler:\$roomVersion")

    // Media3 ExoPlayer & MediaSessionService (Background & Lockscreen Playback)
    val media3Version = "1.4.1"
    implementation("androidx.media3:media3-exoplayer:\$media3Version")
    implementation("androidx.media3:media3-session:\$media3Version")
    implementation("androidx.media3:media3-ui:\$media3Version")

    // DataStore Preferences & Coroutines
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}`,
  },
  {
    path: 'app/src/main/java/com/kamy/musicplayer/data/local/KamyEntities.kt',
    title: 'Room Entities (TrackEntity, PlaybackSessionEntity, PlaylistEntity)',
    module: 'Room SQLite Database',
    code: `package com.kamy.musicplayer.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "tracks",
    indices = [Index(value = ["fileHash"], unique = true)]
)
data class TrackEntity(
    @PrimaryKey val id: String,
    val title: String,
    val artist: String,
    val album: String,
    val genre: String,
    val folderPath: String,
    val contentUri: String,
    val format: String,
    val durationSec: Long,
    val favorite: Boolean = false,
    val addedAt: Long = System.currentTimeMillis(),
    val lastPlayedAt: Long? = null,
    val playCount: Int = 0,
    val pauseCount: Int = 0,
    val skipCount: Int = 0,
    val totalListenedMs: Long = 0L,
    val fileAvailable: Boolean = true,
    val fileHash: String,
    val localLyrics: String? = null
)

@Entity(
    tableName = "playback_sessions",
    indices = [Index(value = ["sessionId"], unique = true), Index(value = ["dateKey"])]
)
data class PlaybackSessionEntity(
    @PrimaryKey val sessionId: String,
    val trackId: String,
    val trackTitle: String,
    val artist: String,
    val album: String,
    val genre: String,
    val startedAt: Long,
    val endedAt: Long,
    val dateKey: String, // YYYY-MM-DD
    val durationMs: Long, // Strictly active audio playback time
    val playCount: Int,
    val pauseCount: Int,
    val skipped: Boolean
)

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val customCoverUri: String? = null,
    val trackIdsCsv: String,
    val createdAt: Long,
    val updatedAt: Long
)`,
  },
  {
    path: 'app/src/main/java/com/kamy/musicplayer/data/local/KamyDatabase.kt',
    title: 'Room Database & Safe SQLite Migrations (MIGRATION_1_2)',
    module: 'Room SQLite Database',
    code: `package com.kamy.musicplayer.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [TrackEntity::class, PlaybackSessionEntity::class, PlaylistEntity::class],
    version = 2,
    exportSchema = true
)
abstract class KamyDatabase : RoomDatabase() {
    abstract fun kamyDao(): KamyDao

    companion object {
        @Volatile
        private var INSTANCE: KamyDatabase? = null

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE tracks ADD COLUMN pauseCount INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE tracks ADD COLUMN skipCount INTEGER NOT NULL DEFAULT 0")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_playback_sessions_sessionId ON playback_sessions(sessionId)")
            }
        }

        fun getInstance(context: Context): KamyDatabase {
            return INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    KamyDatabase::class.java,
                    "kamy_music_permanent.db"
                )
                    .addMigrations(MIGRATION_1_2)
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}`,
  },
  {
    path: 'app/src/main/java/com/kamy/musicplayer/player/PlaybackStatsTracker.kt',
    title: 'Real Playback Time Accumulator (Media3 ExoPlayer Listener)',
    module: 'Media3 ExoPlayer & Stats',
    code: `package com.kamy.musicplayer.player

import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import com.kamy.musicplayer.data.local.KamyDao
import com.kamy.musicplayer.data.local.PlaybackSessionEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Registra exatamente quanto tempo o usuário realmente escutou cada música.
 * A contagem começa somente quando isPlaying == true e playbackState == STATE_READY.
 * Pausas, buffering e navegação nunca são contabilizados.
 */
class PlaybackStatsTracker(
    private val dao: KamyDao,
    private val scope: CoroutineScope
) : Player.Listener {

    private var activeSessionId: String? = null
    private var activeTrackId: String? = null
    private var startedAtMs: Long = 0L
    private var lastPlayResumeMs: Long? = null
    private var accumulatedMs: Long = 0L
    private var pauseCount: Int = 0
    private var periodicSaveJob: Job? = null

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        val now = System.currentTimeMillis()
        if (isPlaying) {
            lastPlayResumeMs = now
            startPeriodicFlush()
        } else {
            lastPlayResumeMs?.let { resumeTime ->
                accumulatedMs += (now - resumeTime).coerceAtLeast(0L)
                pauseCount += 1
            }
            lastPlayResumeMs = null
            periodicSaveJob?.cancel()
            persistCurrentSessionSnapshot(now, skipped = false)
        }
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
        val now = System.currentTimeMillis()
        val wasSkipped = reason == Player.MEDIA_ITEM_TRANSITION_REASON_SEEK
        finalizeSession(now, skipped = wasSkipped)

        mediaItem?.mediaId?.let { newTrackId ->
            activeSessionId = "kamy-\${now}-\${UUID.randomUUID().toString().take(8)}"
            activeTrackId = newTrackId
            startedAtMs = now
            accumulatedMs = 0L
            pauseCount = 0
            lastPlayResumeMs = null
        }
    }

    private fun startPeriodicFlush() {
        periodicSaveJob?.cancel()
        periodicSaveJob = scope.launch {
            while (isActive) {
                delay(5_000L) // Salva a cada 5 segundos no Room Database sem esperar fechar o app
                val now = System.currentTimeMillis()
                lastPlayResumeMs?.let { resumeTime ->
                    accumulatedMs += (now - resumeTime).coerceAtLeast(0L)
                    lastPlayResumeMs = now
                    persistCurrentSessionSnapshot(now, skipped = false)
                }
            }
        }
    }

    private fun persistCurrentSessionSnapshot(now: Long, skipped: Boolean) {
        val sessId = activeSessionId ?: return
        val trkId = activeTrackId ?: return
        if (accumulatedMs <= 0L) return

        val dateKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(startedAtMs))
        scope.launch {
            val track = dao.getTrackById(trkId) ?: return@launch
            dao.upsertSession(
                PlaybackSessionEntity(
                    sessionId = sessId,
                    trackId = trkId,
                    trackTitle = track.title,
                    artist = track.artist,
                    album = track.album,
                    genre = track.genre,
                    startedAt = startedAtMs,
                    endedAt = now,
                    dateKey = dateKey,
                    durationMs = accumulatedMs,
                    playCount = 1,
                    pauseCount = pauseCount,
                    skipped = skipped
                )
            )
            dao.syncTrackTotalListened(trkId)
        }
    }

    fun finalizeSession(now: Long, skipped: Boolean) {
        lastPlayResumeMs?.let { resumeTime ->
            accumulatedMs += (now - resumeTime).coerceAtLeast(0L)
            lastPlayResumeMs = null
        }
        periodicSaveJob?.cancel()
        persistCurrentSessionSnapshot(now, skipped)
    }
}`,
  },
  {
    path: 'app/src/main/java/com/kamy/musicplayer/player/KamyMediaService.kt',
    title: 'Background MediaSessionService (Lockscreen, Notification & Bluetooth)',
    module: 'Media3 ExoPlayer & Stats',
    code: `package com.kamy.musicplayer.player

import android.content.Intent
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.kamy.musicplayer.data.local.KamyDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

class KamyMediaService : MediaSessionService() {
    private var mediaSession: MediaSession? = null
    private lateinit var player: ExoPlayer
    private lateinit var statsTracker: PlaybackStatsTracker
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        val db = KamyDatabase.getInstance(this)
        statsTracker = PlaybackStatsTracker(db.kamyDao(), serviceScope)

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()

        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true) // Pausa automaticamente ao desconectar fone Bluetooth
            .build()

        player.addListener(statsTracker)

        mediaSession = MediaSession.Builder(this, player).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!player.playWhenReady || player.mediaItemCount == 0) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        statsTracker.finalizeSession(System.currentTimeMillis(), skipped = false)
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}`,
  },
];
