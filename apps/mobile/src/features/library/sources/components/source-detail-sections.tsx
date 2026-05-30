import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import { type KnowledgeSourceDetail } from "@/features/library/api";
import { SourceStatusBadge } from "@/features/library/sources/components/source-status-badge";
import {
  formatDateTimeLabel,
  getSourceStatusLabel,
  getSourceTypeLabel,
} from "@/features/library/utils/library-formatters";
import { sourceDetailScreenStyles as styles } from "@/features/library/sources/screens/source-detail-screen.styles";

function SourceInfoRow(props: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{props.label}</Text>
      <Text style={styles.infoValue}>{props.value}</Text>
    </View>
  );
}

export function SourceDetailOverviewSection({
  source,
}: {
  source: KnowledgeSourceDetail;
  mode: "manage" | "card_source_readonly";
}) {
  return (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{source.name}</Text>
            <Text style={styles.heroMeta}>
              {getSourceTypeLabel(source.sourceType)} · 最近更新 {formatDateTimeLabel(source.updatedAt)}
            </Text>
          </View>
          <SourceStatusBadge status={source.status} />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>原始内容</Text>
        <Text style={styles.sectionText}>{source.rawContent}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>来源信息</Text>
        <View style={styles.infoList}>
          <SourceInfoRow label="来源类型" value={getSourceTypeLabel(source.sourceType)} />
          <SourceInfoRow label="来源状态" value={getSourceStatusLabel(source.status)} />
          <SourceInfoRow label="创建时间" value={formatDateTimeLabel(source.createdAt)} />
          <SourceInfoRow label="更新时间" value={formatDateTimeLabel(source.updatedAt)} />
        </View>
      </View>
    </>
  );
}

export function SourceDetailStatsSection({
  pending,
  active,
  archived,
}: {
  pending: number;
  active: number;
  archived: number;
}) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>待确认</Text>
        <Text style={styles.statValue}>{pending}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>已确认</Text>
        <Text style={styles.statValue}>{active}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>已归档</Text>
        <Text style={styles.statValue}>{archived}</Text>
      </View>
    </View>
  );
}

export function SourceDetailManagementSection({
  linkedCount,
  isDeleting,
  onDeleteSourceOnly,
  onDeleteSourceAndCards,
}: {
  linkedCount: number;
  isDeleting: boolean;
  onDeleteSourceOnly: () => void;
  onDeleteSourceAndCards: () => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>来源管理</Text>
      <Text style={styles.sectionText}>关联 {linkedCount} 张卡片，可只删除来源，或同时删除相关卡片。</Text>
      <View style={styles.actionRow}>
        <PrimaryButton
          label={isDeleting ? "处理中…" : "只删除来源"}
          onPress={onDeleteSourceOnly}
          variant="secondary"
        />
        <PrimaryButton
          label={isDeleting ? "处理中…" : linkedCount > 0 ? "删除来源与卡片" : "删除来源"}
          onPress={onDeleteSourceAndCards}
        />
      </View>
    </View>
  );
}

export function SourceDetailPendingSection({
  pendingCount,
  selectedCount,
  isConfirming,
  onToggleSelectAll,
  onConfirm,
}: {
  pendingCount: number;
  selectedCount: number;
  isConfirming: boolean;
  onToggleSelectAll: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>待确认卡片</Text>
      <Text style={styles.sectionText}>选中要保留的卡片后，可一次确认加入卡片库。</Text>
      <View style={styles.actionRow}>
        <PrimaryButton
          label={selectedCount === pendingCount ? "清空选择" : "全选待确认"}
          onPress={onToggleSelectAll}
          variant="secondary"
        />
        <PrimaryButton
          disabled={selectedCount === 0 || isConfirming}
          label={isConfirming ? "确认中…" : `确认选中 (${selectedCount})`}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}

export function SourceDetailCardsSectionHeader({ count }: { count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>卡片列表</Text>
      <Text style={styles.sectionCaption}>共 {count} 张</Text>
    </View>
  );
}
