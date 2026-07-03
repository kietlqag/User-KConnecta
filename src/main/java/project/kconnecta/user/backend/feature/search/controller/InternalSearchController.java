package project.kconnecta.user.backend.feature.search.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import project.kconnecta.user.backend.feature.search.redis.RedisSearchIndexer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/internal/search")
@RequiredArgsConstructor
public class InternalSearchController {

    @Value("${internal.api.key}")
    private String internalApiKey;

    private final RedisSearchIndexer redisSearchIndexer;

    /** Full reindex of users, groups, and posts — admin / ops only. */
    @PostMapping("/reindex")
    public ResponseEntity<Void> reindex(@RequestHeader("X-Internal-Key") String key) {
        validateKey(key);
        redisSearchIndexer.reindexAll();
        return ResponseEntity.ok().build();
    }

    private void validateKey(String key) {
        if (!MessageDigest.isEqual(
                internalApiKey.getBytes(StandardCharsets.UTF_8),
                key.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal key");
        }
    }
}
