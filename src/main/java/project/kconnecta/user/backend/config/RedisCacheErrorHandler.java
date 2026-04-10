package project.kconnecta.user.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;

/**
 * Prevents Redis connection/command failures from bubbling up as HTTP 500s.
 * All errors are logged as warnings; the application continues without caching.
 */
public class RedisCacheErrorHandler implements CacheErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheErrorHandler.class);

    @Override
    public void handleCacheGetError(RuntimeException ex, Cache cache, Object key) {
        log.warn("[Cache GET] cache='{}' key='{}' error={}", cache.getName(), key, ex.getMessage());
    }

    @Override
    public void handleCachePutError(RuntimeException ex, Cache cache, Object key, Object value) {
        log.warn("[Cache PUT] cache='{}' key='{}' error={}", cache.getName(), key, ex.getMessage());
    }

    @Override
    public void handleCacheEvictError(RuntimeException ex, Cache cache, Object key) {
        log.warn("[Cache EVICT] cache='{}' key='{}' error={}", cache.getName(), key, ex.getMessage());
    }

    @Override
    public void handleCacheClearError(RuntimeException ex, Cache cache) {
        log.warn("[Cache CLEAR] cache='{}' error={}", cache.getName(), ex.getMessage());
    }
}
