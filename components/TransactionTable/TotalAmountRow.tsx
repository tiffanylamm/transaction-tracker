interface TotalAmountRowProps {
  totalAmount: number;
}

const TotalAmountRow = ({ totalAmount }: TotalAmountRowProps) => {
  const isPositive = totalAmount >= 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(totalAmount));

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="border-r border-gray-100 dark:border-gray-800" />
      <td className="border-r border-gray-100 dark:border-gray-800" />
      <td className="border-r border-gray-100 dark:border-gray-800" />
      <td className="border-r border-gray-100 dark:border-gray-800" />
      <td className="h-9 px-4 text-[13px] font-medium whitespace-nowrap text-right border-r border-gray-100 dark:border-gray-800">
        <span
          className={
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }
        >
          {isPositive ? "+" : "-"}
          {formatted}
        </span>
      </td>
      <td className="border-r border-gray-100 dark:border-gray-800" />
      <td className="border-r border-gray-100 dark:border-gray-800" />
      <td className="border-r border-gray-100 dark:border-gray-800" />
      <td className="border-r border-gray-100 dark:border-gray-800" />
    </tr>
  );
};

export default TotalAmountRow;
