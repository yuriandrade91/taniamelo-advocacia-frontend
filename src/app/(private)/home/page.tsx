
export default function Home() {
  return (
    <div className="bg-light-gray">
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex gap-4">
          <div className="flex-[8] bg-white rounded-lg min-h-[120px]" />
          <div className="flex-[2] bg-white rounded-lg min-h-[120px]" />
        </div>
        <div className="bg-white rounded-lg min-h-[120px]" />
        <div className="flex gap-4">
          <div className="flex-[2] bg-white rounded-lg min-h-[120px]" />
          <div className="flex-[8] bg-white rounded-lg min-h-[120px]" />
        </div>
      </div>
    </div>
  );
}
