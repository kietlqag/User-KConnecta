package project.kconnecta.user.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

/**
 * Prevents Redis connection/command failures from bubbling up as HTTP 500s.
 * All errors are logged as warnings; the application continues without caching.
 */
public class RedisCacheErrorHandler implements CacheErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheErrorHandler.class);

    @Override
    public void handleCacheGetError(@NonNull RuntimeException ex, @NonNull Cache cache, @NonNull Object key) {
        log.warn("[Cache GET] cache='{}' key='{}' error={}", cache.getName(), key, ex.getMessage());
    }

    @Override
    public void handleCachePutError(@NonNull RuntimeException ex, @NonNull Cache cache, @NonNull Object key, @Nullable Object value) {
        log.warn("[Cache PUT] cache='{}' key='{}' error={}", cache.getName(), key, ex.getMessage());
    }

    @Override
    public void handleCacheEvictError(@NonNull RuntimeException ex, @NonNull Cache cache, @NonNull Object key) {
        log.warn("[Cache EVICT] cache='{}' key='{}' error={}", cache.getName(), key, ex.getMessage());
    }

    @Override
    public void handleCacheClearError(@NonNull RuntimeException ex, @NonNull Cache cache) {
        log.warn("[Cache CLEAR] cache='{}' error={}", cache.getName(), ex.getMessage());
    }
}
