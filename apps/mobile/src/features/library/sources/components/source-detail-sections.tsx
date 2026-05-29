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

export function SourceDetailOverviewSection({
  source,
  mode,
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
        <Text style={styles.heroText}>
          {mode === "card_source_readonly"
            ? "这里展示当前卡片对应的来源内容和基础信息。"
            : "查看原始内容、卡片结果，以及当前需要确认的内容。"}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>原始内容</Text>
        <Text style={styles.sectionText}>{source.rawContent}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>来源信息</Text>
        <Text style={styles.sectionText}>来源类型：{getSourceTypeLabel(source.sourceType)}</Text>
        <Text style={styles.sectionText}>来源状态：{getSourceStatusLabel(source.status)}</Text>
        <Text style={styles.sectionText}>创建时间：{formatDateTimeLabel(source.createdAt)}</Text>
        <Text style={styles.sectionText}>更新时间：{formatDateTimeLabel(source.updatedAt)}</Text>
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
      <Text style={styles.sectionText}>
        当前来源关联 {linkedCount} 张卡片。你可以只删除来源，或同时删除相关卡片。
      </Text>
      <View style={styles.actionRow}>
        <PrimaryButton label={isDeleting ? "处理中…" : "只删除来源"} onPress={onDeleteSourceOnly} variant="secondary" />
        <PrimaryButton label={isDeleting ? "处理中…" : linkedCount > 0 ? "删除来源与卡片" : "删除来源"} onPress={onDeleteSourceAndCards} />
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
      <Text style={styles.sectionText}>选中需要保留的卡片后，可一次性确认加入卡片库。</Text>
      <View style={styles.actionRow}>
        <PrimaryButton label={selectedCount === pendingCount ? "清空选择" : "全选待确认"} onPress={onToggleSelectAll} variant="secondary" />
        <PrimaryButton disabled={selectedCount === 0 || isConfirming} label={isConfirming ? "确认中…" : `确认选中 (${selectedCount})`} onPress={onConfirm} />
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
