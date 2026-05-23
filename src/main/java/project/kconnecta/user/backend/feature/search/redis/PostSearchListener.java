package project.kconnecta.user.backend.feature.search.redis;

import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import project.kconnecta.user.backend.config.ApplicationContextHolder;
import project.kconnecta.user.backend.feature.post.entity.Post;

public class PostSearchListener {

    @PostPersist
    @PostUpdate
    public void onSaveOrUpdate(Post post) {
        runSafely(() -> indexer().indexPost(post));
    }

    @PostRemove
    public void onDelete(Post post) {
        runSafely(() -> indexer().deletePost(post.getId()));
    }

    private RedisSearchIndexer indexer() {
        return ApplicationContextHolder.getBean(RedisSearchIndexer.class);
    }

    private void runSafely(Runnable action) {
        if (!ApplicationContextHolder.isReady()) return;
        try { action.run(); } catch (Exception ignored) {}
    }
}
