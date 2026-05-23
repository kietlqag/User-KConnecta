package project.kconnecta.user.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import redis.clients.jedis.DefaultJedisClientConfig;
import redis.clients.jedis.HostAndPort;
import redis.clients.jedis.JedisClientConfig;
import redis.clients.jedis.JedisPooled;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class RedisSearchConfig {

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

    @Bean
    public JedisPooled jedisPooled() {
        if (redisUrl != null && !redisUrl.isBlank()) {
            return fromUrl(redisUrl);
        }
        return fromProps();
    }

    private JedisPooled fromUrl(String url) {
        try {
            URI uri = URI.create(url);
            String h = uri.getHost();
            int p = uri.getPort() > 0 ? uri.getPort() : 6379;
            boolean ssl = "rediss".equalsIgnoreCase(uri.getScheme());

            String user = null;
            String pass = null;
            if (uri.getUserInfo() != null) {
                String[] parts = uri.getUserInfo().split(":", 2);
                if (parts.length == 2) {
                    user = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
                    pass = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
                }
            }

            JedisClientConfig cfg = DefaultJedisClientConfig.builder()
                    .user(user)
                    .password(pass)
                    .ssl(ssl)
                    .build();
            return new JedisPooled(new HostAndPort(h, p), cfg);
        } catch (Exception e) {
            return fromProps();
        }
    }

    private JedisPooled fromProps() {
        DefaultJedisClientConfig.Builder builder = DefaultJedisClientConfig.builder().ssl(sslEnabled);
        if (password != null && !password.isBlank()) {
            builder.password(password);
        }
        if (username != null && !username.isBlank()) {
            builder.user(username);
        }
        return new JedisPooled(new HostAndPort(host, port), builder.build());
    }
}
