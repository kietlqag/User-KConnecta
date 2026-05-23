package project.kconnecta.user.backend.feature.search.redis;

import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import project.kconnecta.user.backend.config.ApplicationContextHolder;
import project.kconnecta.user.backend.feature.group.entity.Group;

public class GroupSearchListener {

    @PostPersist
    @PostUpdate
    public void onSaveOrUpdate(Group group) {
        runSafely(() -> indexer().indexGroup(group));
    }

    @PostRemove
    public void onDelete(Group group) {
        runSafely(() -> indexer().deleteGroup(group.getId()));
    }

    private RedisSearchIndexer indexer() {
        return ApplicationContextHolder.getBean(RedisSearchIndexer.class);
    }

    private void runSafely(Runnable action) {
        if (!ApplicationContextHolder.isReady()) return;
        try { action.run(); } catch (Exception ignored) {}
    }
}
