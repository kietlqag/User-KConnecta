package project.kconnecta.user.backend.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * Activated only when spring.cache.type=redis (docker profile).
 *
 * Implements CachingConfigurer so that our RedisCacheErrorHandler is registered
 * with the cache interceptor - this is the hook that swallows connection errors
 * at runtime instead of propagating them as HTTP 500s.
 *
 * When spring.cache.type=none (base / local profile), this entire class is skipped
 * and Spring's auto-configuration does not create any RedisCacheManager.
 */
@Configuration
@SuppressWarnings("null")
public class RedisConfig implements CachingConfigurer {

    @Value("${REDIS_URL:}")
    private String redisUrl;

    @Value("${spring.data.redis.host:localhost}")
    private String host;

    @Value("${spring.data.redis.port:6379}")
    private int port;

    @Value("${spring.data.redis.username:}")
    private String username;

    @Value("${spring.data.redis.password:}")
    private String password;

    @Value("${spring.data.redis.ssl.enabled:false}")
    private boolean sslEnabled;

    @Value("${spring.data.redis.timeout:2000}")
    private long timeoutMs;

    // -------------------------------------------------------------------------
    // Connection factory
    // -------------------------------------------------------------------------

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisConnectionSettings settings = resolveConnectionSettings();

        SocketOptions socketOptions = SocketOptions.builder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .build();

        ClientOptions clientOptions = ClientOptions.builder()
                .socketOptions(socketOptions)
                .build();

        LettuceClientConfiguration.LettuceClientConfigurationBuilder clientBuilder =
                LettuceClientConfiguration.builder()
                        .commandTimeout(Duration.ofMillis(timeoutMs))
                        .clientOptions(clientOptions);

        if (settings.ssl()) {
            clientBuilder.useSsl();
        }

        LettuceClientConfiguration clientConfig = clientBuilder.build();

        RedisStandaloneConfiguration serverConfig =
                new RedisStandaloneConfiguration(settings.host(), settings.port());

        if (!settings.username().isBlank()) {
            serverConfig.setUsername(settings.username());
        }
        if (!settings.password().isBlank()) {
            serverConfig.setPassword(RedisPassword.of(settings.password()));
        }

        LettuceConnectionFactory factory = new LettuceConnectionFactory(serverConfig, clientConfig);
        factory.setValidateConnection(false); // lazy - startup never blocks on Redis availability
        return factory;
    }

    private RedisConnectionSettings resolveConnectionSettings() {
        if (!redisUrl.isBlank()) {
            URI uri = URI.create(redisUrl.trim());
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            boolean useSsl = "rediss".equals(scheme);

            String resolvedHost = uri.getHost() == null ? host : uri.getHost();
            int resolvedPort = uri.getPort() == -1 ? 6379 : uri.getPort();

            String resolvedUsername = "";
            String resolvedPassword = "";
            String userInfo = uri.getUserInfo();
            if (userInfo != null && !userInfo.isBlank()) {
                String[] parts = userInfo.split(":", 2);
                resolvedUsername = decode(parts[0]);
                if (parts.length > 1) {
                    resolvedPassword = decode(parts[1]);
                }
            }

            return new RedisConnectionSettings(
                    resolvedHost,
                    resolvedPort,
                    resolvedUsername,
                    resolvedPassword,
                    useSsl
            );
        }

        return new RedisConnectionSettings(host, port, username, password, sslEnabled);
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private record RedisConnectionSettings(
            String host,
            int port,
            String username,
            String password,
            boolean ssl
    ) {
    }

    // -------------------------------------------------------------------------
    // Cache manager
    // -------------------------------------------------------------------------

    @Bean
    @Override
    @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
    public RedisCacheManager cacheManager() {
        // Per-cache TTL overrides - default is 600s, search suggestions expire in 60s
        Map<String, RedisCacheConfiguration> perCacheConfig = Map.of(
                "searchSuggest", redisCacheConfiguration().entryTtl(Duration.ofSeconds(60))
        );

        return RedisCacheManager.builder(redisConnectionFactory())
                .cacheDefaults(redisCacheConfiguration())
                .withInitialCacheConfigurations(perCacheConfig)
                .build();
    }

    private RedisCacheConfiguration redisCacheConfiguration() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.activateDefaultTyping(
                objectMapper.getPolymorphicTypeValidator(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer serializer =
                new GenericJackson2JsonRedisSerializer(objectMapper);

        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMillis(600_000))
                .disableCachingNullValues()
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                );
    }

    // -------------------------------------------------------------------------
    // RedisTemplate - for direct key/value operations if ever needed
    // -------------------------------------------------------------------------

    @Bean
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    // -------------------------------------------------------------------------
    // Error handler - cache failures become WARN logs, never HTTP 500s
    // -------------------------------------------------------------------------

    @Override
    @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
    public CacheErrorHandler errorHandler() {
        return new RedisCacheErrorHandler();
    }
}
