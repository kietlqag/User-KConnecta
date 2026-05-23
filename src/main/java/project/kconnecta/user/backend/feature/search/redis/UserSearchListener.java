package project.kconnecta.user.backend.feature.search.redis;

import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import project.kconnecta.user.backend.config.ApplicationContextHolder;
import project.kconnecta.user.backend.feature.user.entity.User;

public class UserSearchListener {

    @PostPersist
    @PostUpdate
    public void onSaveOrUpdate(User user) {
        runSafely(() -> indexer().indexUser(user));
    }

    @PostRemove
    public void onDelete(User user) {
        runSafely(() -> indexer().deleteUser(user.getId()));
    }

    private RedisSearchIndexer indexer() {
        return ApplicationContextHolder.getBean(RedisSearchIndexer.class);
    }

    private void runSafely(Runnable action) {
        if (!ApplicationContextHolder.isReady()) return;
        try { action.run(); } catch (Exception ignored) {}
    }
}
